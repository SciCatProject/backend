const SOURCE_COLLECTIONS = ["Dataset"];
const BATCH_SIZE = 10000;

function buildPipeline(sourceType) {
  return [
    {
      $project: {
        datasetId: "$_id",
        ownerGroup: 1,
        accessGroups: 1,
        isPublished: 1,
        metaArr: { $objectToArray: "$scientificMetadata" },
      },
    },
    { $unwind: "$metaArr" },
    {
      $project: {
        datasetId: 1,
        key: "$metaArr.k",
        isPublished: 1,
        humanReadableName: { $ifNull: ["$metaArr.v.human_name", ""] },
        userGroups: {
          $setUnion: [["$ownerGroup"], { $ifNull: ["$accessGroups", []] }],
        },
      },
    },
    {
      $unwind: {
        path: "$userGroups",
      },
    },
    {
      $group: {
        _id: {
          metaKeyId: {
            $concat: [`${sourceType}_`, "$key", "_", "$humanReadableName"],
          },
          group: "$userGroups",
        },
        key: { $first: "$key" },
        humanReadableName: { $first: "$humanReadableName" },
        isPublished: { $max: "$isPublished" },
        groupCount: { $sum: 1 },
        datasetIds: { $addToSet: "$datasetId" },
      },
    },
    {
      $group: {
        _id: "$_id.metaKeyId",
        key: { $first: "$key" },
        humanReadableName: { $first: "$humanReadableName" },
        isPublished: { $max: "$isPublished" },
        userGroups: { $push: "$_id.group" },
        userGroupCountsArr: {
          $push: { k: "$_id.group", v: "$groupCount" },
        },
        datasetIdSets: { $push: "$datasetIds" },
      },
    },
    {
      $addFields: {
        metaKeyId: "$_id",
        generatedId: {
          $function: {
            body: "function() { return UUID().toString().replace('UUID(\"', '').replace('\")', ''); }",
            args: [],
            lang: "js",
          },
        },
      },
    },
    {
      $project: {
        _id: "$generatedId",
        metaKeyId: 1,
        key: 1,
        sourceType: { $literal: sourceType },
        humanReadableName: 1,
        isPublished: 1,
        userGroups: 1,
        userGroupCounts: { $arrayToObject: "$userGroupCountsArr" },
        usageCount: {
          $size: {
            $reduce: {
              input: "$datasetIdSets",
              initialValue: [],
              in: { $setUnion: ["$$value", "$$this"] },
            },
          },
        },
        createdBy: { $literal: "migration" },
        createdAt: { $toDate: "$$NOW" },
      },
    },
    {
      $merge: {
        into: "MetadataKeys",
        on: "metaKeyId",
        whenMatched: [
          {
            $replaceWith: {
              $mergeObjects: ["$$new", { _id: "$_id" }],
            },
          },
        ],
        whenNotMatched: "insert",
      },
    },
  ];
}

module.exports = {
  async up(db) {
    const start = Date.now();
    const elapsed = () => `${((Date.now() - start) / 1000).toFixed(1)}s`;

    // Wipe MetadataKeys collection first to ensure a clean state
    const deleted = await db.collection("MetadataKeys").deleteMany({});

    await db
      .collection("MetadataKeys")
      .createIndex({ metaKeyId: 1 }, { unique: true });

    console.log(
      `[${elapsed()}] Cleared ${deleted.deletedCount} existing MetadataKeys`,
    );

    for (const collection of SOURCE_COLLECTIONS) {
      const total = await db.collection(collection).countDocuments({
        scientificMetadata: { $exists: true, $type: "object" },
      });

      if (total === 0) {
        console.log(
          `[${elapsed()}] No documents with scientificMetadata in ${collection}, skipping...`,
        );
        continue;
      }

      console.log(
        `[${elapsed()}] Processing ${total.toLocaleString()} documents from ${collection}...`,
      );

      let lastId = null;
      let processed = 0;

      while (true) {
        const match = {
          scientificMetadata: { $exists: true, $type: "object" },
          ...(lastId && { _id: { $gt: lastId } }),
        };

        const batch = await db
          .collection(collection)
          .find(match)
          .sort({ _id: 1 })
          .limit(BATCH_SIZE)
          .project({ _id: 1 })
          .toArray();

        if (batch.length === 0) break;

        const batchIds = batch.map((d) => d._id);

        await db
          .collection(collection)
          .aggregate(
            [
              { $match: { _id: { $in: batchIds } } },
              ...buildPipeline(collection),
            ],
            { allowDiskUse: true, maxTimeMS: 0 },
          )
          .toArray();

        lastId = batch[batch.length - 1]._id;
        processed += batch.length;

        console.log(
          `[${elapsed()}] ${collection}: ${processed.toLocaleString()}/${total.toLocaleString()}`,
        );
      }

      console.log(`[${elapsed()}] ✅ ${collection} done`);
    }

    await db.collection("MetadataKeys").dropIndex("metaKeyId_1");
    await db
      .collection("MetadataKeys")
      .updateMany({}, [{ $set: { id: "$_id" } }, { $unset: ["metaKeyId"] }]);

    const result = await db.collection("MetadataKeys").countDocuments();
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
