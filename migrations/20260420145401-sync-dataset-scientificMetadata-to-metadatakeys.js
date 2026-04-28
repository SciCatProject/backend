const SOURCE_COLLECTIONS = ["Dataset"];

function buildPipeline(sourceType) {
  return [
    // Stage 1: Flatten scientificMetadata into an array of key/value pairs.
    // Preserve _id as datasetId so we can count unique datasets later.
    {
      $project: {
        datasetId: "$_id",
        ownerGroup: 1,
        accessGroups: 1,
        isPublished: 1,
        metaArr: { $objectToArray: "$scientificMetadata" },
      },
    },

    // Stage 2: One document per (dataset, metadata key)
    { $unwind: "$metaArr" },

    // Stage 3: Shape each (dataset, key) document.
    // userGroups is the union of ownerGroup + accessGroups for this dataset.
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

    // Stage 4: One document per (dataset, key, group).
    {
      $unwind: {
        path: "$userGroups",
        preserveNullAndEmptyArrays: true,
      },
    },

    // Stage 5: Filter out null and empty-string groups.
    // Note: datasets with no valid groups are excluded from usageCount.
    // This is acceptable since ownerGroup is a required field in practice.
    {
      $match: {
        userGroups: { $nin: [null, ""] },
      },
    },

    // Stage 6: Group by (metaKeyId, group).
    // groupCount = how many datasets with this group use this key.
    // datasetIds = set of distinct dataset IDs (for accurate usageCount).
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

    // Stage 7: Group by metaKeyId to reassemble one document per metadata key.
    // userGroupCountsArr will become the userGroupCounts Map.
    // datasetIdSets is a list of per-group dataset ID sets — merged in the
    // next stage to compute total unique dataset count (usageCount).
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

    // Stage 8: Final projection.
    // userGroupCounts: [{k,v}] array → plain object (stored as Map in Mongoose).
    // usageCount: union all per-group datasetId sets, count distinct IDs.
    {
      $project: {
        _id: 1,
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

    // Stage 9: Merge into MetadataKeys.
    // whenMatched handles the (future) case where multiple SOURCE_COLLECTIONS
    // produce the same _id. Not possible today since sourceType is part of
    // the _id, but kept correct for when more collections are added.
    {
      $merge: {
        into: "MetadataKeys",
        on: "_id",
        whenMatched: [
          {
            $replaceWith: {
              $mergeObjects: [
                "$$new",
                {
                  // Preserve original audit fields
                  createdAt: { $ifNull: ["$createdAt", "$$new.createdAt"] },
                  createdBy: { $ifNull: ["$createdBy", "$$new.createdBy"] },
                  updatedBy: { $literal: "migration" },
                  updatedAt: { $toDate: "$$NOW" },

                  // Merge group arrays
                  userGroups: {
                    $setUnion: ["$userGroups", "$$new.userGroups"],
                  },

                  // Additively merge userGroupCounts — sum counts per group
                  // across both the existing and incoming documents.
                  userGroupCounts: {
                    $arrayToObject: {
                      $map: {
                        input: {
                          $setUnion: [
                            {
                              $map: {
                                input: { $objectToArray: "$userGroupCounts" },
                                as: "e",
                                in: "$$e.k",
                              },
                            },
                            {
                              $map: {
                                input: {
                                  $objectToArray: "$$new.userGroupCounts",
                                },
                                as: "e",
                                in: "$$e.k",
                              },
                            },
                          ],
                        },
                        as: "group",
                        in: {
                          k: "$$group",
                          v: {
                            $add: [
                              {
                                $ifNull: [
                                  {
                                    $getField: {
                                      field: "$$group",
                                      input: "$userGroupCounts",
                                    },
                                  },
                                  0,
                                ],
                              },
                              {
                                $ifNull: [
                                  {
                                    $getField: {
                                      field: "$$group",
                                      input: "$$new.userGroupCounts",
                                    },
                                  },
                                  0,
                                ],
                              },
                            ],
                          },
                        },
                      },
                    },
                  },

                  // Any source being published makes the key published
                  isPublished: { $or: ["$isPublished", "$$new.isPublished"] },

                  // Add incoming dataset count to existing
                  usageCount: { $add: ["$usageCount", "$$new.usageCount"] },
                },
              ],
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
    const BATCH_SIZE = 10000;
    const start = Date.now();
    const elapsed = () => `${((Date.now() - start) / 1000).toFixed(1)}s`;

    // Wipe MetadataKeys collection first to ensure a clean state
    const deleted = await db.collection("MetadataKeys").deleteMany({});
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
              ...buildPipeline(collection).slice(1),
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
