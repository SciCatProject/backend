/* eslint-disable @typescript-eslint/no-require-imports */
const {
  encodeScientificMetadataKeys,
  decodeScientificMetadataKeys,
} = require("../dist/common/utils");

module.exports = {
  async up(db, client) {
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

      console.log(
        `Updating Dataset (Id: ${dataset._id}) with encoded scientificMetadata keys`,
      );
      await db
        .collection("Dataset")
        .updateOne(
          { _id: dataset._id },
          { $set: { scientificMetadata: encodedMetadata } },
        );
    };
  },

  async down(db, client) {
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

      console.log(
        `Reverting Dataset (Id: ${dataset._id}) to decoded scientificMetadata keys`,
      );
      await db
        .collection("Dataset")
        .updateOne(
          { _id: dataset._id },
          { $set: { scientificMetadata: decodedMetadata } },
        );
    };
  },
};
