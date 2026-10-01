import { QueryableClass } from "src/common/schemas/queryable.schema";
import { FilterQuery } from "mongoose";
import { withOCCFilter } from "./occ-util";

describe("OCC Util", () => {
  const filterQuery: FilterQuery<QueryableClass> = { createdBy: "abc" };
  const unmodifiedSince = new Date("2026-01-01");

  it("adds unmodifiedSince if supplied", () => {
    const result = withOCCFilter(filterQuery, unmodifiedSince);
    expect(result).not.toBe(filterQuery);
    expect(result).toEqual({
      createdBy: "abc",
      updatedAt: { $lte: unmodifiedSince },
    });
  });

  it("returns original filter unchanged if no unmodifiedSince provided", () => {
    const result = withOCCFilter(filterQuery, undefined);
    expect(result).toBe(filterQuery);
    expect(result).toEqual(filterQuery);
  });
});
