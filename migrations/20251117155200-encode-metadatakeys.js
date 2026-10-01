/* eslint-disable @typescript-eslint/no-require-imports */
const {
  encodeScientificMetadataKeys,
  decodeScientificMetadataKeys,
} = require("../dist/common/utils");

/**
 *
 * This migration encodes the keys of the scientificMetadata field in the Dataset collection
 * to ensure they are compatible with MongoDB's key restrictions. The up function encodes the keys,
 * while the down function decodes them back to their original form.
 */

module.exports = {
  async up(db, client) {
    let bulkOps = [];
    const BATCH_SIZE = 10000;
    let modifiedCount = 0;
    let unModifiedCount = 0;

    for await (const dataset of db
      .collection("Dataset")
      .find({ scientificMetadata: { $exists: true } })) {
      const metadata = dataset.scientificMetadata;
      if (!metadata || typeof metadata !== "object") continue;

      let encodedMetadata;
      try {
        encodedMetadata = encodeScientificMetadataKeys(metadata);
      } catch (err) {
        console.error(
          `Error encoding scientificMetadata for Dataset (Id: ${dataset._id}):`,
          err,
        );
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: dataset._id },
          update: { $set: { scientificMetadata: encodedMetadata } },
        },
      });

      if (bulkOps.length === BATCH_SIZE) {
        const bulkWriteResult = await db.collection("Dataset").bulkWrite(bulkOps, {
          ordered: false
        });
        modifiedCount += bulkWriteResult.modifiedCount;
        unModifiedCount += BATCH_SIZE - bulkWriteResult.modifiedCount;

        bulkOps = [];
        console.log("migrating, count, unModifiedCount: ",
          modifiedCount,
          unModifiedCount,
        );
      }
    }

    if (bulkOps.length > 0) {
      console.log(`Executing bulk update for ${bulkOps.length} datasets`);
      const bulkWriteResult = await db.collection("Dataset").bulkWrite(bulkOps, { ordered: false });
      modifiedCount += bulkWriteResult.modifiedCount;
      unModifiedCount += bulkOps.length - bulkWriteResult.modifiedCount;
    }
    console.log("FINISHED: count, unModifiedCount: ", modifiedCount, unModifiedCount);
  },

  async down(db, client) {
    let bulkOps = [];
    const BATCH_SIZE = 10000;
    let modifiedCount = 0;
    let unModifiedCount = 0;

    for await (const dataset of db
      .collection("Dataset")
      .find({ scientificMetadata: { $exists: true } })) {
      const metadata = dataset.scientificMetadata;
      if (!metadata || typeof metadata !== "object") continue;

      let decodedMetadata;

      try {
        decodedMetadata = decodeScientificMetadataKeys(metadata);
      } catch (err) {
        console.error(
          `Error decoding scientificMetadata for Dataset (Id: ${dataset._id}):`,
          err,
        );
        continue;
      }

      bulkOps.push({
        updateOne: {
          filter: { _id: dataset._id },
          update: { $set: { scientificMetadata: decodedMetadata } },
        },
      });

      if (bulkOps.length === BATCH_SIZE) {
        const bulkWriteResult = await db.collection("Dataset").bulkWrite(bulkOps, {
          ordered: false
        });
        modifiedCount += bulkWriteResult.modifiedCount;
        unModifiedCount += BATCH_SIZE - bulkWriteResult.modifiedCount;

        bulkOps = [];
        console.log("migrating, count, unModifiedCount: ",
          modifiedCount,
          unModifiedCount,
        );
      }
    }

    if (bulkOps.length > 0) {
      console.log(`Executing bulk revert for ${bulkOps.length} datasets`);
      const bulkWriteResult = await db.collection("Dataset").bulkWrite(bulkOps, { ordered: false });
      modifiedCount += bulkWriteResult.modifiedCount;
      unModifiedCount += bulkOps.length - bulkWriteResult.modifiedCount;
    }
    console.log("FINISHED: count, unModifiedCount: ", modifiedCount, unModifiedCount);
  },
};
