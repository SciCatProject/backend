module.exports = {
  async up(db) {
    // datasetlifecycle no longer has an _id (@Schema({ _id: false })); drop the ones already stored.
    await db
      .collection("Dataset")
      .updateMany(
        { "datasetlifecycle._id": { $exists: true } },
        { $unset: { "datasetlifecycle._id": "" } },
      );
  },

  async down() {
    // no path backward: the removed ids were never used
  },
};
