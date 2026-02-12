keywords = [{
  keyword: "setFullName",
  schema: false,
  modifying: true,
  validate: function(data, dataCxt) {
    data.name =
      data.givenName && data.familyName ?
      `${data.familyName}, ${data.givenName}` :
      data.givenName || data.familyName || undefined
    return true;
  }
}]

async function mergeKeywords(ctx) {
  const datasets = await ctx.datasetsService.findAll({
    where: {
      $or: ctx.publishedData.datasetPids.map(p => ({
        pid: p
      }))
    }
  });

  return () => {
    if (datasets) {
      return Array.from(
        new Set(datasets.flatMap((ds) => ds.keywords))
      ).map(k => ({
        subject: k,
        lang: "en"
      }))
    }
  }
}

const dynamicDefaults = new Map([
  ['mergeKeywords', mergeKeywords],
]);


module.exports = {
  keywords,
  dynamicDefaults
}