const { v4: uuidv4 } = require("uuid");

const BULK_FLUSH_SIZE = 1000;

// Splits one pre-v4 flat Policy document (archiveEmailNotification,
// tapeRedundancy, ..., retrieveEmailNotification, ...) into an archive and
// a retrieve document - see src/policies/schemas/policy.schema.ts and
// src/policies/utils/policy-legacy-shape.util.ts.
//
// The original schema never enforced one document per ownerGroup, so
// duplicates are a real, observed condition. Every document is split, none
// deleted: the winner (see up() below) becomes the live pair; every other
// one is split too but marked `supersededBy` pointing at the winner's
// documents. `originalPolicyId` links a pair back to the pre-split
// document it came from, only so down() can reassemble them.
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
    // misread its (now absent) legacy fields as unset and wipe out data.
    //
    // One pass, sorted by {ownerGroup, mostRecentlyUpdated desc}: the first
    // document seen for an ownerGroup is the winner (split live); every
    // following one for the same ownerGroup is a duplicate, split too but
    // marked `supersededBy` pointing at the winner's ids, already known by
    // then.
    //
    // allowDiskUse: no supporting index exists yet for this $sort - without
    // it, a large enough collection would fail this migration outright
    // instead of just running slower.
    let bulkOps = [];
    const flush = async () => {
      if (bulkOps.length === 0) return;
      await db.collection("Policy").bulkWrite(bulkOps);
      bulkOps = [];
    };

    const cursor = db.collection("Policy").aggregate(
      [
        { $match: { type: { $exists: false } } },
        {
          $addFields: {
            sortKey: {
              $ifNull: ["$updatedAt", { $ifNull: ["$createdAt", new Date(0)] }],
            },
          },
        },
        { $sort: { ownerGroup: 1, sortKey: -1 } },
      ],
      { allowDiskUse: true },
    );

    let currentOwnerGroup;
    let winnerIds;
    for await (const doc of cursor) {
      const isWinner = doc.ownerGroup !== currentOwnerGroup;
      currentOwnerGroup = doc.ownerGroup;

      if (isWinner) {
        console.log(
          `Splitting Policy for ownerGroup "${doc.ownerGroup}" into archive/retrieve`,
        );
      } else {
        console.log(
          `ownerGroup "${doc.ownerGroup}" has a duplicate policy document (_id: ${doc._id}) - this was never supposed to be possible, but the original schema didn't prevent it. Splitting it too, marked as superseded by "${winnerIds.archiveId}". Nothing is deleted.`,
        );
      }

      const { archiveDoc, retrieveDoc } = splitPolicy(
        doc,
        isWinner ? undefined : winnerIds,
      );
      if (isWinner) {
        winnerIds = { archiveId: archiveDoc._id, retrieveId: retrieveDoc._id };
      }
      bulkOps.push({
        replaceOne: { filter: { _id: doc._id }, replacement: archiveDoc },
      });
      bulkOps.push({ insertOne: { document: retrieveDoc } });
      if (bulkOps.length >= BULK_FLUSH_SIZE) await flush();
    }
    await flush();

    // Created only now, after the split: pre-split duplicate ownerGroups
    // all share (ownerGroup, type: null), so this index would reject the
    // very first duplicate if built beforehand. Partial, not plain unique,
    // since superseded documents may legitimately share (ownerGroup, type)
    // with the live one that replaced them.
    //
    // {supersededBy: null}, not {$exists: false}: partial filter
    // expressions reject $exists:false outright (it's implemented via
    // $not, which isn't supported). {field: null} covers the same "absent
    // or null" case as a plain equality match. Must match
    // src/policies/schemas/policy.schema.ts's index definition exactly.
    await db.collection("Policy").createIndex(
      { ownerGroup: 1, type: 1 },
      {
        unique: true,
        partialFilterExpression: { supersededBy: null },
      },
    );
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
      // Unioned: the two documents' manager lists can diverge post-split
      // (each patchable independently via PoliciesV4Service) - matches
      // mergeArchiveRetrieveToLegacyDto.
      const manager = Array.from(
        new Set([
          ...(archiveDoc?.manager || []),
          ...(retrieveDoc?.manager || []),
        ]),
      );

      console.log(
        `Merging split documents for original policy "${originalPolicyId}" (ownerGroup "${representative.ownerGroup}") back into one flat document`,
      );

      const flatDoc = {
        _id: originalPolicyId,
        ownerGroup: representative.ownerGroup,
        accessGroups: representative.accessGroups,
        isPublished: representative.isPublished,
        instrumentGroup: representative.instrumentGroup,
        manager,
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

      // The archive doc keeps the original _id (see splitPolicy), so
      // replacing it restores that _id in place; the retrieve doc got a
      // fresh id during up() and is deleted once folded into flatDoc.
      bulkOps.push({
        replaceOne: { filter: { _id: originalPolicyId }, replacement: flatDoc },
      });
      if (retrieveDoc && retrieveDoc._id !== originalPolicyId) {
        bulkOps.push({ deleteOne: { filter: { _id: retrieveDoc._id } } });
      }
    };

    // Two passes: a document's pairing key differs depending on whether it
    // predates this migration.
    //
    // Pass 1 - documents split by up() share one originalPolicyId per
    // pair, so sorting by it and grouping consecutive documents pairs them
    // correctly.
    //
    // Pass 2 - documents created after this migration ran (e.g. via
    // PoliciesService.create) have no originalPolicyId at all, only the
    // ownerGroup they share - grouped by that instead. Best-effort only:
    // rolling back after new data has accumulated is inherently lossy.
    const flushGroup = (key, group) => {
      if (group.length === 0) return;
      mergeGroup(key, group);
    };

    const mergeByOriginalPolicyId = async () => {
      const cursor = db
        .collection("Policy")
        .find({ type: { $exists: true }, originalPolicyId: { $exists: true } })
        .sort({ originalPolicyId: 1 });

      let currentKey;
      let currentGroup = [];
      for await (const doc of cursor) {
        if (doc.originalPolicyId !== currentKey) {
          flushGroup(currentKey, currentGroup);
          currentGroup = [];
          currentKey = doc.originalPolicyId;
        }
        currentGroup.push(doc);
        if (bulkOps.length >= BULK_FLUSH_SIZE) await flush();
      }
      flushGroup(currentKey, currentGroup);
    };

    const mergeByOwnerGroup = async () => {
      const cursor = db
        .collection("Policy")
        .find({ type: { $exists: true }, originalPolicyId: { $exists: false } })
        .sort({ ownerGroup: 1 });

      let currentKey;
      let currentGroup = [];
      const flushCurrentGroup = () => {
        if (currentGroup.length === 0) return;
        // No originalPolicyId to restore to - use mergeGroup's own
        // representative (archive preferred) as the flat document's _id,
        // so the surviving document is the one that keeps it.
        const representative =
          currentGroup.find((doc) => doc.type === "archive") || currentGroup[0];
        mergeGroup(representative._id, currentGroup);
      };

      for await (const doc of cursor) {
        if (doc.ownerGroup !== currentKey) {
          flushCurrentGroup();
          currentGroup = [];
          currentKey = doc.ownerGroup;
        }
        currentGroup.push(doc);
        if (bulkOps.length >= BULK_FLUSH_SIZE) await flush();
      }
      flushCurrentGroup();
    };

    await mergeByOriginalPolicyId();
    await mergeByOwnerGroup();
    await flush();
  },
};
