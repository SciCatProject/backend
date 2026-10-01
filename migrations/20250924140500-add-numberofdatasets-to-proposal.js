module.exports = {
  async up(db, client) {

    for await (const proposal of db.collection("Proposal").find({})) {
      
      const datasetCount = await db
        .collection("Dataset")
        .countDocuments({ proposalIds: proposal.proposalId });

      await db.collection("Proposal").updateOne(
        { _id: proposal._id },
        { $set: { numberOfDatasets: datasetCount } }
      );
    }
  },

  async down(db, client) {
    // No path backward
  },
};
