module.exports = {
  async up(db, client) {
    await db
      .collection("Sample")
      .updateMany({ sampleName: { $exists: false } }, [
        { $set: { sampleName: "$sampleId" } },
      ]);
  },

  async down(db, client) {
    // no path backward
  },
};
