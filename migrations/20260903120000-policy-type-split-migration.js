const { v4: uuidv4 } = require("uuid");

// Max pending bulkWrite operations before flushing - bounds memory (each
// entry is one small write instruction, not a full document) while keeping
// round trips far below one per document.
const BULK_FLUSH_SIZE = 1000;

// Splits each existing Policy document - still in the original, pre-v4 flat
// shape (archiveEmailNotification, archiveEmailsToBeNotified,
// tapeRedundancy, ..., retrieveEmailNotification, ...) - into one flat
// document per (ownerGroup, type) pair. See
// src/policies/schemas/policy.schema.ts,
// src/policies/dto/policy.obsolete.dto.ts (archiveV3FieldMap/
// retrieveV3FieldMap, which this mirrors) and
// src/policies/utils/policy-legacy-shape.util.ts.
//
// The *original* schema never enforced one document per ownerGroup (no
// unique index existed before this migration), and
// PoliciesService.addDefaultPolicy's check-then-create has always had a
// race window, so pre-existing ownerGroup duplicates are a real, observed
// condition, not a hypothetical edge case.
//
// Resolution: split EVERY document, including duplicates - nothing is
// deleted. Among documents sharing an ownerGroup, the most recently updated
// one becomes the live (ownerGroup, type) pair (the one every normal query
// sees, per PoliciesService's default supersededBy exclusion); every other
// one is split too, but marked `supersededBy` pointing at the live
// document of the same type. `originalPolicyId` links each archive/retrieve
// pair back to the single pre-split document it came from, purely so down()
// can reassemble them - it has no meaning to the running application.
function splitPolicy(policy, supersededBy) {
  const commonFields = {
    ownerGroup: policy.ownerGroup,
    accessGroups: policy.accessGroups,
    isPublished: policy.isPublished,
    instrumentGroup: policy.instrumentGroup,
    manager: policy.manager,
    createdBy: policy.createdBy,
    updatedBy: policy.updatedBy,
    createdAt: policy.createdAt,
    updatedAt: policy.updatedAt,
    originalPolicyId: policy._id,
  };

  const policyParams = {};
  if (policy.tapeRedundancy !== undefined)
    policyParams.tapeRedundancy = policy.tapeRedundancy;
  if (policy.autoArchive !== undefined)
    policyParams.autoArchive = policy.autoArchive;
  if (policy.autoArchiveDelay !== undefined)
    policyParams.autoArchiveDelay = policy.autoArchiveDelay;
  if (policy.embargoPeriod !== undefined)
    policyParams.embargoPeriod = policy.embargoPeriod;

  const archiveDoc = {
    _id: policy._id,
    ...commonFields,
    type: "archive",
    emailNotification: policy.archiveEmailNotification,
    emailTo: policy.archiveEmailsToBeNotified,
  };
  if (Object.keys(policyParams).length > 0)
    archiveDoc.policyParams = policyParams;
  if (supersededBy) archiveDoc.supersededBy = supersededBy.archiveId;

  const retrieveDoc = {
    _id: uuidv4(),
    ...commonFields,
    type: "retrieve",
    emailNotification: policy.retrieveEmailNotification,
    emailTo: policy.retrieveEmailsToBeNotified,
  };
  if (supersededBy) retrieveDoc.supersededBy = supersededBy.retrieveId;

  return { archiveDoc, retrieveDoc };
}

module.exports = {
  async up(db, client) {
    // Only unsplit documents - re-processing an already-split one would
    // misread its (now absent) legacy fields as unset and wipe out real
    // data, and would try to insert a second retrieve document.
    //
    // Three steps, in this specific order:
    //
    // 1. A pure aggregation resolves "who's the winner" per ownerGroup
    //    entirely server-side and stamps supersededBy on the losers,
    //    pointing at the winner's original (pre-split) _id - nothing is
    //    created here, just one field set on existing documents. This runs
    //    BEFORE the unique index is created below, and that ordering is
    //    load-bearing, not incidental: before this step, duplicate
    //    ownerGroups (the exact case this migration exists for) all share
    //    (ownerGroup, type: null), since `type` doesn't exist pre-split -
    //    creating a unique index over that data would fail immediately with
    //    a duplicate key error on the very first duplicate ownerGroup
    //    (confirmed against a live server). Once losers carry supersededBy,
    //    only the winner per ownerGroup remains uncovered by the partial
    //    filter below, so the index build no longer sees any collision.
    //
    //    This also is what lets step 3 below be a flat, ungrouped loop:
    //    every document already knows whether it's a winner or a loser just
    //    by checking its own supersededBy field, no need to re-derive group
    //    membership or recency ordering in JS.
    await db
      .collection("Policy")
      .aggregate([
        { $match: { type: { $exists: false } } },
        {
          $addFields: {
            sortKey: {
              $ifNull: ["$updatedAt", { $ifNull: ["$createdAt", new Date(0)] }],
            },
          },
        },
        { $sort: { ownerGroup: 1, sortKey: -1 } },
        {
          $group: {
            _id: "$ownerGroup",
            winnerId: { $first: "$_id" },
            allIds: { $push: "$_id" },
          },
        },
        { $match: { $expr: { $gt: [{ $size: "$allIds" }, 1] } } },
        {
          $project: {
            winnerId: 1,
            loserIds: { $slice: ["$allIds", 1, { $size: "$allIds" }] },
          },
        },
        { $unwind: "$loserIds" },
        { $project: { _id: "$loserIds", supersededBy: "$winnerId" } },
        {
          $merge: {
            into: "Policy",
            whenMatched: "merge",
            whenNotMatched: "discard",
          },
        },
      ])
      .toArray();

    // 2. Only now can the partial unique index be created: any accidental
    //    attempt to insert a second *live* document for the same
    //    (ownerGroup, type) fails fast instead of silently creating a
    //    duplicate. Partial (not a plain unique index) because superseded
    //    documents are deliberately kept, and may legitimately share
    //    (ownerGroup, type) with the live document that replaced them.
    //
    //    {supersededBy: null}, not {$exists: false}: partial filter
    //    expressions only support a narrow operator set, and $exists:false
    //    is implemented internally via $not, which is rejected outright
    //    (confirmed against a live server - createIndex fails immediately
    //    with "Expression not supported in partial index: $not").
    //    {field: null} is the standard workaround - as an equality match it
    //    covers both "field absent" and "field explicitly null" (this
    //    migration only ever leaves it absent, never sets it to null),
    //    giving the same "live document" coverage $exists:false was meant
    //    to express. Must match src/policies/schemas/policy.schema.ts's
    //    index definition exactly.
    await db.collection("Policy").createIndex(
      { ownerGroup: 1, type: 1 },
      {
        unique: true,
        partialFilterExpression: { supersededBy: null },
      },
    );

    // 3. A single streaming pass splits every document. Winners (no
    //    supersededBy) are split first - sorting by supersededBy puts them
    //    first, since Mongo sorts a missing field ahead of any real value -
    //    and each winner's freshly generated retrieve-document id is
    //    recorded in a small Map (originalId -> retrieveId; at most one
    //    entry per ownerGroup, not per document). Losers are split after,
    //    looking up their winner's retrieve id from that Map to resolve
    //    their own retrieve-side supersededBy pointer, which step 1 could
    //    not yet know (the winner's retrieve document doesn't exist until
    //    this step creates it).
    let bulkOps = [];
    const flush = async () => {
      if (bulkOps.length === 0) return;
      await db.collection("Policy").bulkWrite(bulkOps);
      bulkOps = [];
    };

    const winnerRetrieveIdByOriginalId = new Map();
    const cursor = db
      .collection("Policy")
      .find({ type: { $exists: false } })
      .sort({ supersededBy: 1 });

    for await (const doc of cursor) {
      if (!doc.supersededBy) {
        console.log(
          `Splitting Policy for ownerGroup "${doc.ownerGroup}" into archive/retrieve`,
        );
        const { archiveDoc, retrieveDoc } = splitPolicy(doc);
        winnerRetrieveIdByOriginalId.set(doc._id, retrieveDoc._id);
        bulkOps.push({
          replaceOne: { filter: { _id: doc._id }, replacement: archiveDoc },
        });
        bulkOps.push({ insertOne: { document: retrieveDoc } });
      } else {
        // Guaranteed present: documents without supersededBy sort first, so
        // every winner has already been split by the time its losers are
        // reached here.
        const winnerRetrieveId = winnerRetrieveIdByOriginalId.get(
          doc.supersededBy,
        );
        if (!winnerRetrieveId) {
          throw new Error(
            `Migration invariant violated: winner "${doc.supersededBy}" for loser "${doc._id}" was not processed before this loser.`,
          );
        }
        console.log(
          `ownerGroup "${doc.ownerGroup}" has a duplicate policy document (_id: ${doc._id}) - this was never supposed to be possible, but the original schema didn't prevent it. Splitting it too, marked as superseded by "${doc.supersededBy}". Nothing is deleted.`,
        );
        const { archiveDoc, retrieveDoc } = splitPolicy(doc, {
          archiveId: doc.supersededBy,
          retrieveId: winnerRetrieveId,
        });
        bulkOps.push({
          replaceOne: { filter: { _id: doc._id }, replacement: archiveDoc },
        });
        bulkOps.push({ insertOne: { document: retrieveDoc } });
      }
      if (bulkOps.length >= BULK_FLUSH_SIZE) await flush();
    }
    await flush();
  },

  async down(db, client) {
    await db
      .collection("Policy")
      .dropIndex({ ownerGroup: 1, type: 1 })
      .catch(() => {});

    let bulkOps = [];
    const flush = async () => {
      if (bulkOps.length === 0) return;
      await db.collection("Policy").bulkWrite(bulkOps);
      bulkOps = [];
    };

    const mergeGroup = (originalPolicyId, group) => {
      const archiveDoc = group.find((doc) => doc.type === "archive");
      const retrieveDoc = group.find((doc) => doc.type === "retrieve");
      const representative = archiveDoc || retrieveDoc;
      if (!representative) return;
      const extra = archiveDoc?.policyParams || {};

      console.log(
        `Merging split documents for original policy "${originalPolicyId}" (ownerGroup "${representative.ownerGroup}") back into one flat document`,
      );

      const flatDoc = {
        _id: originalPolicyId,
        ownerGroup: representative.ownerGroup,
        accessGroups: representative.accessGroups,
        isPublished: representative.isPublished,
        instrumentGroup: representative.instrumentGroup,
        manager: representative.manager,
        archiveEmailNotification: archiveDoc?.emailNotification,
        archiveEmailsToBeNotified: archiveDoc?.emailTo,
        tapeRedundancy: extra.tapeRedundancy,
        autoArchive: extra.autoArchive,
        autoArchiveDelay: extra.autoArchiveDelay,
        embargoPeriod: extra.embargoPeriod,
        retrieveEmailNotification: retrieveDoc?.emailNotification,
        retrieveEmailsToBeNotified: retrieveDoc?.emailTo,
        createdBy: representative.createdBy,
        updatedBy: representative.updatedBy,
        createdAt: representative.createdAt,
        updatedAt: representative.updatedAt,
      };

      // The archive doc always keeps the original document's _id (see
      // splitPolicy above), so replacing it with the flat shape restores
      // that _id in place; the retrieve doc got a fresh id during up() and
      // is deleted (its content is already folded into flatDoc above).
      bulkOps.push({
        replaceOne: { filter: { _id: originalPolicyId }, replacement: flatDoc },
      });
      if (retrieveDoc && retrieveDoc._id !== originalPolicyId) {
        bulkOps.push({ deleteOne: { filter: { _id: retrieveDoc._id } } });
      }
    };

    // Same reasoning as up(): one cursor, sorted so each original policy's
    // archive/retrieve pair (sharing one originalPolicyId) arrives
    // consecutively, rather than a distinct() list of ids plus a per-id
    // requery. originalPolicyId is a migration-only field with no index,
    // so - unlike up()'s ownerGroup sort - this does cost Mongo an
    // in-memory sort server-side; still just ids and small documents from
    // the split collection, nowhere near the 100MB sort limit for any
    // realistic Policy collection size.
    //
    // Documents with no originalPolicyId (created after this migration ran,
    // under the new schema) sort together at one end (Mongo sorts a missing
    // field first in ascending order) and fall back to their own id (see
    // the comment on splitPolicy's originalPolicyId above) - best-effort
    // only; rolling back after new data has accumulated under the new shape
    // is inherently lossy. Each is necessarily its own group (a fallback
    // key derived from a document's own unique _id can't collide with
    // another document's), so they're merged individually rather than
    // accumulated.
    const cursor = db
      .collection("Policy")
      .find({ type: { $exists: true } })
      .sort({ originalPolicyId: 1 });

    let currentKey;
    let currentGroup = [];
    const flushCurrentGroup = () => {
      if (currentGroup.length === 0) return;
      mergeGroup(currentKey, currentGroup);
      currentGroup = [];
    };

    for await (const doc of cursor) {
      if (doc.originalPolicyId === undefined) {
        flushCurrentGroup();
        mergeGroup(doc._id, [doc]);
        currentKey = undefined;
      } else {
        if (doc.originalPolicyId !== currentKey) {
          flushCurrentGroup();
          currentKey = doc.originalPolicyId;
        }
        currentGroup.push(doc);
      }
      if (bulkOps.length >= BULK_FLUSH_SIZE) await flush();
    }
    flushCurrentGroup();
    await flush();
  },
};
