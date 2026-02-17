module.exports = {
  async up(db) {
    const DATASET_COL = "Dataset";
    const METAKEYS_COL = "MetadataKeys";

    // Aggregation pipeline to extract metadata keys from datasets
    const pipeline = [
      // 1) Only datasets that have scientificMetadata object
      { $match: { scientificMetadata: { $exists: true, $type: "object" } } },

      // 2) Prepare fields and convert scientificMetadata -> array
      {
        $project: {
          sourceType: { $literal: "dataset" },
          sourceId: "$pid",
          ownerGroup: 1,
          accessGroups: 1,
          isPublished: 1,
          metaArr: { $objectToArray: "$scientificMetadata" }, // {k,v}[]
        },
      },

      // 3) One document per metadata key
      { $unwind: "$metaArr" },

      // 4) Shape final MetadataKeys document
      {
        $project: {
          _id: { $concat: ["dataset_", "$sourceId", "_", "$metaArr.k"] }, // unique per dataset
          sourceType: 1,
          sourceId: 1,
          key: "$metaArr.k", // metadata key name
          userGroups: {
            $setUnion: [
              [{ $ifNull: ["$ownerGroup", ""] }],
              { $ifNull: ["$accessGroups", []] },
            ],
          }, // owner + access groups fallback
          isPublished: 1,

          // only include humanReadableName if exists
          humanReadableName: {
            $cond: [
              { $ifNull: ["$metaArr.v.human_name", false] },
              "$metaArr.v.human_name",
              "$$REMOVE",
            ],
          },
          createdBy: { $literal: "migration" },
          createdAt: { $toDate: "$$NOW" },
        },
      },

      // 5) Upsert into MetadataKeys
      {
        $merge: {
          into: METAKEYS_COL,
          on: "_id", // match by dataset id
          whenMatched: [
            {
              $set: {
                sourceType: "$$new.sourceType",
                sourceId: "$$new.sourceId",
                key: "$$new.key",
                userGroups: "$$new.userGroups",
                isPublished: "$$new.isPublished",
                humanReadableName: "$$new.humanReadableName",
                updatedBy: { $literal: "migration" },
                updatedAt: { $toDate: "$$NOW" },
              },
            },
          ],
          whenNotMatched: "insert",
        },
      },
    ];

    console.log("--- Syncing metadata keys from datasets ---");

    const start = Date.now();
    const timer = setInterval(() => {
      const sec = Math.floor((Date.now() - start) / 1000);
      console.log(`Syncing... ${sec}s`);
    }, 1000); // log every 1s

    await db
      .collection(DATASET_COL)
      .aggregate(pipeline, { allowDiskUse: true })
      .toArray();
    clearInterval(timer);
    console.log("--- Syncing metadata keys from datasets completed ---");
  },

  // Rollback: clear MetadataKeys collection
  async down(db) {
    await db.collection("MetadataKeys").deleteMany({});
  },
};
