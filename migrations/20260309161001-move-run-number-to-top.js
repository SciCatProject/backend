async function bulkUpdate(collection, bulkOps, stats, postLoop = false) {
  const BATCH_SIZE = 1000;
  if (bulkOps.length === 0 || (bulkOps.length < BATCH_SIZE && !postLoop)) return;
  console.log(`Executing bulk update for ${bulkOps.length}`);
  const bulkWriteResult = await collection.bulkWrite(bulkOps, {
    ordered: false
  });
  stats.modifiedCount += bulkWriteResult.modifiedCount;
  stats.unModifiedCount += (bulkWriteResult.matchedCount - bulkWriteResult.modifiedCount);
  bulkOps.length = 0;
  console.log("migrating, count, unModifiedCount: ", stats.modifiedCount, stats.unModifiedCount);
  if (postLoop) console.log("FINISHED: count, unModifiedCount: ", stats.modifiedCount, stats.unModifiedCount);
}


module.exports = {
  async up(db, client) {
    let bulkOps = [];
    const stats = { modifiedCount: 0, unModifiedCount: 0 };
    const collection = db.collection("Dataset");
    for await (const dataset of collection
      .find({ "scientificMetadata.runNumber": { $exists: true }, "runNumber": { $exists: false } })) {
      bulkOps.push({
        updateOne: {
          filter: { _id: dataset._id },
          update: {
            $set: { runNumber: dataset.scientificMetadata.runNumber },
            $unset: {"scientificMetadata.runNumber": ""},
          },
        },
      });
      await bulkUpdate(collection, bulkOps, stats);
    }
    await bulkUpdate(collection, bulkOps, stats, true);
  },

  async down(db, client) {
    let bulkOps = [];
    const stats = { modifiedCount: 0, unModifiedCount: 0 };
    const collection = db.collection("Dataset");
    for await (const dataset of collection
      .find({ "scientificMetadata.runNumber": { $exists: false }, "runNumber": { $exists: true } })) {
      bulkOps.push({
        updateOne: {
          filter: { _id: dataset._id },
          update: {
            $set: { "scientificMetadata.runNumber": dataset.runNumber },
            $unset: {runNumber: ""},
          },
        },
      });
      await bulkUpdate(collection, bulkOps, stats);
    }
    await bulkUpdate(collection, bulkOps, stats, true);
  },
};
