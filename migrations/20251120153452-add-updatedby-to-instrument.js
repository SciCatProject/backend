module.exports = {
  async up(db, client) {
    await db
      .collection("Instrument")
      .updateMany(
        { updatedBy: { $exists: false } },
        [{ $set: { updatedBy: "$createdBy" } }]
      );
  },

  async down(db, client) {
    // No path backward as it's not easy to find on down where updatedBy was added
  },
};