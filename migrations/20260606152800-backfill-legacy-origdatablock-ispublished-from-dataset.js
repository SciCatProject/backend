module.exports = {
  async up(db) {
    const start = Date.now();
    const timer = setInterval(() => {
      console.log(
        `Running backfill-legacy-origdatablock-ispublished-from-dataset... ${Math.floor((Date.now() - start) / 1000)}s`,
      );
    }, 1000);

    try {
      await db
        .collection("OrigDatablock")
        .aggregate([
          { $match: { isPublished: { $exists: false } } },
          {
            $lookup: {
              from: "Dataset",
              localField: "datasetId",
              foreignField: "pid",
              as: "dataset",
            },
          },
          {
            $set: {
              isPublished: {
                $ifNull: [{ $arrayElemAt: ["$dataset.isPublished", 0] }, false],
              },
            },
          },
          { $unset: "dataset" },
          {
            $merge: { into: "OrigDatablock", on: "_id", whenMatched: "merge" },
          },
        ])
        .next();
    } finally {
      clearInterval(timer);
      console.log(
        `Done backfill-legacy-origdatablock-ispublished-from-dataset in ${((Date.now() - start) / 1000).toFixed(1)}s`,
      );
    }
  },

  async down(db, client) {
    // no path backward
  },
};
