keywords = [
  // Automatically sets the name property based on givenName and familyName
  {
    keyword: "setFullName",
    schema: false,
    modifying: true,
    validate: function (data, dataCxt) {
      data.name =
        data.givenName && data.familyName
          ? `${data.familyName}, ${data.givenName}`
          : data.givenName || data.familyName || undefined;
      return true;
    },
  },
];

// Computes the sum of all datasets size in DataCite format
async function computeTotalSize(ctx) {
  const datasets = await ctx.datasetsService.findAll({
    where: {
      $or: ctx.publishedData.datasetPids.map((p) => ({
        pid: p,
      })),
    },
  });

  return () => {
    if (!datasets) return;

    return [datasets.reduce((acc, ds) => acc + (ds.size ?? 0), 0).toString()];
  };
}

const dynamicDefaults = new Map([
  ["computeTotalSize", computeTotalSize],
]);

module.exports = {
  keywords,
  dynamicDefaults,
};
