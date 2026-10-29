/* eslint-disable @typescript-eslint/no-require-imports */
const { randomUUID } = require("crypto");
const {
  createMetadataKeysInstance,
  decodeURIComponentExtended,
} = require("../dist/common/utils");

// The fields createMetadataKeysInstance reads the metadata from
const SOURCES = [{ collection: "Dataset", field: "scientificMetadata" }];
const BATCH_SIZE = 10000;
// Also flush early when a batch has many distinct keys (e.g. keys unique per
// dataset), so memory is bounded by keys and not only by datasets
const MAX_KEYS_PER_FLUSH = 10000;
const INVALID_GROUP = /\.|^\$/;

// Adds the keys of one source document to the batch totals, the same way
// MetadataKeysService.upsertMany counts them.
function accumulate(totals, { userGroups, isPublished, metadata }) {
  for (const [rawKey, entry] of Object.entries(metadata)) {
    // In the sources these keys are field names, so they're URL-encoded for Mongo
    // field-name rules. Store them decoded here so incoming queries — from the frontend
    // or other services hitting scicat directly — match without re-encoding first.
    const key = decodeURIComponentExtended(rawKey);
    const humanReadableName =
      typeof entry?.human_name === "string" ? entry.human_name : "";
    const id = JSON.stringify([key, humanReadableName]);

    let total = totals.get(id);
    if (!total) {
      total = {
        key,
        humanReadableName,
        usageCount: 0,
        isPublished: false,
        // no prototype, so groups like "constructor" or "__proto__" are own counters
        userGroupCounts: Object.create(null),
      };
      totals.set(id, total);
    }
    total.usageCount += 1;
    total.isPublished ||= isPublished;
    for (const group of userGroups) {
      total.userGroupCounts[group] = (total.userGroupCounts[group] ?? 0) + 1;
    }
  }
}

function toUpsert(sourceType, total, now) {
  const id = randomUUID();
  return {
    updateOne: {
      filter: {
        sourceType,
        key: total.key,
        humanReadableName: total.humanReadableName,
      },
      update: {
        $set: { updatedAt: now },
        $inc: {
          usageCount: total.usageCount,
          ...Object.fromEntries(
            Object.entries(total.userGroupCounts).map(([group, count]) => [
              `userGroupCounts.${group}`,
              count,
            ]),
          ),
        },
        $max: { isPublished: total.isPublished },
        $addToSet: {
          userGroups: { $each: Object.keys(total.userGroupCounts) },
        },
        $setOnInsert: {
          _id: id,
          id,
          createdBy: "migration",
          updatedBy: "migration",
          createdAt: now,
        },
      },
      upsert: true,
    },
  };
}

module.exports = {
  async up(db) {
    const start = Date.now();
    const elapsed = () => `${((Date.now() - start) / 1000).toFixed(1)}s`;
    const metadataKeys = db.collection("MetadataKeys");

    // Group names are used as `userGroupCounts.<group>` update paths (as in
    // MetadataKeysService), so a "." would nest the count and a leading "$" is
    // rejected. Stop before wiping anything rather than storing corrupted counts.
    for (const source of SOURCES) {
      const invalidGroups = [];
      for (const field of ["ownerGroup", "accessGroups"]) {
        const values = await db
          .collection(source.collection)
          .distinct(field, { [field]: INVALID_GROUP });
        invalidGroups.push(...values.filter((g) => INVALID_GROUP.test(g)));
      }
      if (invalidGroups.length > 0) {
        throw new Error(
          `${source.collection} has groups that cannot be used as MetadataKeys userGroupCounts keys: ${[...new Set(invalidGroups)].join(", ")}`,
        );
      }
    }

    // Clear the keys rebuilt here and the obsolete one-per-source entries
    // (identified by sourceId), keeping current keys of the other source types
    const deleted = await metadataKeys.deleteMany({
      $or: [
        { sourceType: { $in: SOURCES.map((s) => s.collection) } },
        { sourceId: { $exists: true } },
      ],
    });
    console.log(
      `[${elapsed()}] Cleared ${deleted.deletedCount} existing MetadataKeys`,
    );

    // A failed run of the previous version of this migration can leave its
    // unique metaKeyId index behind, which rejects every key after the first
    await metadataKeys.dropIndex("metaKeyId_1").catch((error) => {
      if (!["IndexNotFound", "NamespaceNotFound"].includes(error.codeName)) {
        throw error;
      }
    });

    // same index as the app schema, so every upsert finds its key via an index
    await metadataKeys.createIndex({ sourceType: 1, key: 1 });

    for (const source of SOURCES) {
      const match = { [source.field]: { $type: "object" } };
      const total = await db
        .collection(source.collection)
        .countDocuments(match);

      if (total === 0) {
        console.log(
          `[${elapsed()}] No documents with ${source.field} in ${source.collection}, skipping...`,
        );
        continue;
      }

      console.log(
        `[${elapsed()}] Processing ${total.toLocaleString()} documents from ${source.collection}...`,
      );

      const cursor = db
        .collection(source.collection)
        .find(match)
        .project({
          ownerGroup: 1,
          accessGroups: 1,
          isPublished: 1,
          [source.field]: 1,
        })
        .batchSize(BATCH_SIZE);

      let totals = new Map();
      let processed = 0;
      const flush = async () => {
        if (totals.size === 0) return;
        const now = new Date();
        await metadataKeys.bulkWrite(
          [...totals.values()].map((t) => toUpsert(source.collection, t, now)),
          { ordered: false },
        );
        totals = new Map();
        console.log(
          `[${elapsed()}] ${source.collection}: ${processed.toLocaleString()}/${total.toLocaleString()}`,
        );
      };

      for await (const doc of cursor) {
        accumulate(totals, createMetadataKeysInstance(source.collection, doc));
        processed += 1;
        if (processed % BATCH_SIZE === 0 || totals.size >= MAX_KEYS_PER_FLUSH) {
          await flush();
        }
      }
      await flush();

      console.log(`[${elapsed()}] ✅ ${source.collection} done`);
    }

    const result = await metadataKeys.countDocuments();
    console.log(
      `[${elapsed()}] Migration completed — Total MetadataKeys: ${result.toLocaleString()}`,
    );
  },

  async down(db) {
    const start = Date.now();
    const elapsed = () => `${((Date.now() - start) / 1000).toFixed(1)}s`;

    const total = await db.collection("MetadataKeys").countDocuments();
    console.log(
      `[${elapsed()}] Deleting ${total.toLocaleString()} MetadataKeys...`,
    );

    const deleted = await db.collection("MetadataKeys").deleteMany({});
    console.log(
      `[${elapsed()}] Rollback completed — Deleted ${deleted.deletedCount} MetadataKeys`,
    );
  },
};
