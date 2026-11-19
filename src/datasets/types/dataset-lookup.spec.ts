import { DATASET_LOOKUP_FIELDS, DatasetLookupKeysEnum } from "./dataset-lookup";

describe("DATASET_LOOKUP_FIELDS", () => {
  describe("attachments", () => {
    const lookup = DATASET_LOOKUP_FIELDS[DatasetLookupKeysEnum.attachments];

    it("joins on the indexed relationships.targetId field", () => {
      expect(lookup?.$lookup.localField).toBe("pid");
      expect(lookup?.$lookup.foreignField).toBe("relationships.targetId");
    });

    it("keeps matching targetId and targetType on the same relationship", () => {
      const match = JSON.stringify(lookup?.$lookup.pipeline);

      expect(match).toContain("$$relationship.targetId");
      expect(match).toContain("$$relationship.targetType");
    });
  });
});
