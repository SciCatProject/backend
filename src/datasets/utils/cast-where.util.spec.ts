import { BadRequestException } from "@nestjs/common";
import { castDatasetWhere } from "./cast-where.util";

describe("castDatasetWhere", () => {
  const date = new Date("2026-01-01");

  it("casts dataset fields to their schema types", () => {
    expect(
      castDatasetWhere({ size: "100", creationTime: { $gte: "2026-01-01" } }),
    ).toEqual({ size: 100, creationTime: { $gte: date } });
  });

  it("casts extended json date markers", () => {
    expect(
      castDatasetWhere({ creationTime: { $gte: { $date: "2026-01-01" } } }),
    ).toEqual({ creationTime: { $gte: date } });
  });

  it("casts conditions on relations to the related schema types", () => {
    expect(
      castDatasetWhere({
        "proposals.startTime": { $gte: "2026-01-01" },
        $or: [
          { size: { $lt: "5" } },
          { "datablocks.dataFileList.time": { $lt: "2026-01-01" } },
        ],
        samples: { $elemMatch: { isPublished: "true" } },
      }),
    ).toEqual({
      "proposals.startTime": { $gte: date },
      $or: [
        { size: { $lt: 5 } },
        { "datablocks.dataFileList.time": { $lt: date } },
      ],
      samples: { $elemMatch: { isPublished: true } },
    });
  });

  it("leaves free-form fields and expressions as they are", () => {
    const where = {
      "scientificMetadata.temperature.value": "5",
      $expr: { $gt: ["$size", 1] },
    };
    expect(castDatasetWhere(structuredClone(where))).toEqual(where);
  });

  it("rejects values that do not fit the schema type", () => {
    expect(() => castDatasetWhere({ size: "abc" })).toThrow(
      BadRequestException,
    );
  });
});
