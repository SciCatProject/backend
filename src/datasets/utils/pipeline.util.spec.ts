import { castWhereFilter } from "./pipeline.util";

describe("castWhereFilter", () => {
  it("casts a date range on a single field", () => {
    const where = {
      createdAt: {
        $gte: { $date: "2026-08-01T00:00:00.000Z" },
        $lt: { $date: "2026-09-01T00:00:00.000Z" },
      },
    };

    expect(castWhereFilter(where)).toEqual({
      createdAt: {
        $gte: new Date("2026-08-01T00:00:00.000Z"),
        $lt: new Date("2026-09-01T00:00:00.000Z"),
      },
    });
  });

  it("casts dates mixed with plain scalar filters", () => {
    const where = {
      ownerGroup: "scicat",
      isPublished: false,
      "scientificMetadata.temperature.value": { $gt: 300 },
      updatedAt: { $lte: { $date: "2026-09-10T12:00:00.000Z" } },
    };

    expect(castWhereFilter(where)).toEqual({
      ownerGroup: "scicat",
      isPublished: false,
      "scientificMetadata.temperature.value": { $gt: 300 },
      updatedAt: { $lte: new Date("2026-09-10T12:00:00.000Z") },
    });
  });

  it("casts dates inside $and / $or branches", () => {
    const where = {
      $and: [
        {
          $or: [
            { ownerGroup: "scicat" },
            { accscicatGroups: { $in: ["scicat"] } },
          ],
        },
        { creationTime: { $gte: { $date: "2026-01-01T00:00:00.000Z" } } },
      ],
    };

    expect(castWhereFilter(where)).toEqual({
      $and: [
        {
          $or: [
            { ownerGroup: "scicat" },
            { accscicatGroups: { $in: ["scicat"] } },
          ],
        },
        { creationTime: { $gte: new Date("2026-01-01T00:00:00.000Z") } },
      ],
    });
  });

  it("casts an array of dates in $in", () => {
    const where = {
      creationTime: {
        $in: [
          { $date: "2026-08-31T00:00:00.000Z" },
          { $date: "2026-09-01T00:00:00.000Z" },
        ],
      },
    };

    expect(castWhereFilter(where)).toEqual({
      creationTime: {
        $in: [
          new Date("2026-08-31T00:00:00.000Z"),
          new Date("2026-09-01T00:00:00.000Z"),
        ],
      },
    });
  });

  it("casts dates nested under $elemMatch", () => {
    const where = {
      history: {
        $elemMatch: {
          property: "ownerGroup",
          updatedAt: { $gte: { $date: "2026-06-01T00:00:00.000Z" } },
        },
      },
    };

    expect(castWhereFilter(where)).toEqual({
      history: {
        $elemMatch: {
          property: "ownerGroup",
          updatedAt: { $gte: new Date("2026-06-01T00:00:00.000Z") },
        },
      },
    });
  });

  it("leaves a query without markers unchanged", () => {
    const where = {
      type: "raw",
      ownerGroup: { $in: ["ess", "dmsc"] },
      "datasetlifecycle.archivable": true,
      $nor: [{ pid: { $regex: "^test" } }],
    };
    const original = structuredClone(where);

    expect(castWhereFilter(where)).toEqual(original);
    expect(where).toEqual(original);
  });

  it("leaves an already-cast Date in place", () => {
    const date = new Date("2026-08-31T00:00:00.000Z");
    expect(castWhereFilter({ createdAt: { $gte: date } })).toEqual({
      createdAt: { $gte: date },
    });
  });

  it("passes through markers it does not know yet", () => {
    const where = { _id: { $oid: "64f0c0de1234567890abcdef" } };
    expect(castWhereFilter(where)).toEqual(where);
  });
});
