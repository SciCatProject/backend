module.exports = {
  async up(db) {
    // datasetlifecycle no longer has an _id (@Schema({ _id: false })); keep it as the lifecycle id.
    await db
      .collection("Dataset")
      .updateMany({ "datasetlifecycle._id": { $exists: true } }, [
        {
          $set: {
            "datasetlifecycle.id": { $toString: "$datasetlifecycle._id" },
          },
        },
        { $unset: "datasetlifecycle._id" },
      ]);
  },

  async down() {},
};
