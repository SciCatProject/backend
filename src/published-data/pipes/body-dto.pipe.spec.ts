import { CreatePublishedDataDto } from "../dto/create-published-data.dto";
import { V3_TO_V4_DTO_BODY_PIPE } from "./body-dto.pipe";

describe("V3_TO_V4_DTO_BODY_PIPE", () => {
  const transform = (value: Record<string, unknown>) =>
    V3_TO_V4_DTO_BODY_PIPE.transform(
      value as unknown as CreatePublishedDataDto,
    );

  it("normalizes a scalar v3 pidArray to a v4 datasetPids array", () => {
    expect(transform({ pidArray: "dataset-1" }).datasetPids).toEqual([
      "dataset-1",
    ]);
  });

  it("preserves an array v3 pidArray", () => {
    expect(
      transform({ pidArray: ["dataset-1", "dataset-2"] }).datasetPids,
    ).toEqual(["dataset-1", "dataset-2"]);
  });

  it("normalizes a null v3 pidArray to an empty array", () => {
    expect(transform({ pidArray: null }).datasetPids).toEqual([]);
  });

  it("keeps an omitted v3 pidArray undefined", () => {
    expect(transform({}).datasetPids).toBeUndefined();
  });
});
