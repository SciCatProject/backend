import { DatablockSchema } from "./datablock.schema";

describe("DatablockSchema", () => {
  it("should have an index on datasetId", () => {
    const indexFields = DatablockSchema.indexes().map(([fields]) => fields);
    expect(indexFields).toContainEqual({ datasetId: 1 });
  });
});
