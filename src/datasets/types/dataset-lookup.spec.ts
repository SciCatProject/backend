import { ALLOWED_DATASET_KEYS, DATASET_RELATIONS } from "./dataset-lookup";

describe("DATASET_RELATIONS", () => {
  // where keys named after a relation are treated as conditions on it
  it("does not overlap with dataset fields", () => {
    expect(
      DATASET_RELATIONS.filter((relation) =>
        ALLOWED_DATASET_KEYS.includes(relation),
      ),
    ).toEqual([]);
  });
});
