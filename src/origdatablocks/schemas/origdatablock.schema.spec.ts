import { OrigDatablockSchema } from "./origdatablock.schema";

describe("OrigDatablockSchema", () => {
  it("should have an index on datasetId", () => {
    const indexFields = OrigDatablockSchema.indexes().map(
      ([fields]) => fields,
    );
    expect(indexFields).toContainEqual({ datasetId: 1 });
  });
});
