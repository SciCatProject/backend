module.exports = {
  async up(db, client) {
    for await (const dataset of db.collection("Dataset").find({ size: 0 })) {
        let origDatablockSizeSum = 0;
        let origDatablockNumberOfFilesSum = 0;
        for await (const origDatablock of db.collection("OrigDatablock").find({datasetId: dataset._id})) {
            origDatablockSizeSum += origDatablock.size;
            origDatablockNumberOfFilesSum += origDatablock.dataFileList.length;
          }

        let datablockSizeSum = 0;
        let datablockNumberOfFilesSum = 0;
        for await (const datablock of db.collection("Datablock").find({datasetId: dataset._id})) {
            datablockSizeSum += datablock.size;
            datablockNumberOfFilesSum += datablock.dataFileList.length;
        }

        console.log(
          `Updating Dataset (Id: ${dataset._id}) with size: ${origDatablockSizeSum}, packedSize: ${datablockSizeSum}, numberOfFiles: ${origDatablockNumberOfFilesSum}, numberOfFilesArchived: ${datablockNumberOfFilesSum}`,
        );

        await db.collection("Dataset").updateOne(
          {
            _id: dataset._id,
          },
          {
            $set: {
              size: origDatablockSizeSum,
              packedSize: datablockSizeSum,
              numberOfFiles: origDatablockNumberOfFilesSum,
              numberOfFilesArchived: datablockNumberOfFilesSum
            },
          },
        );
      };
  },

  async down(db, client) {},
};
