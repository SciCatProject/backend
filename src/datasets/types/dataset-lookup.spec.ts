import { DATASET_LOOKUP_FIELDS, DatasetLookupKeysEnum } from "./dataset-lookup";

describe("DATASET_LOOKUP_FIELDS", () => {
  describe("attachments", () => {
    const lookup = DATASET_LOOKUP_FIELDS[DatasetLookupKeysEnum.attachments];

    it("joins on the indexed relationships.targetId field", () => {
      expect(lookup?.$lookup.localField).toBe("pid");
      expect(lookup?.$lookup.foreignField).toBe("relationships.targetId");
    });

    it("keeps matching targetId and targetType on the same relationship", () => {
      expect(lookup?.$lookup.pipeline).toEqual([
        {
          $match: {
            $expr: {
              $anyElementTrue: {
                $map: {
                  input: "$relationships",
                  as: "relationship",
                  in: {
                    $and: [
                      { $eq: ["$$relationship.targetId", "$$pid"] },
                      { $eq: ["$$relationship.targetType", "dataset"] },
                    ],
                  },
                },
              },
            },
          },
        },
      ]);
    });
  });
});
