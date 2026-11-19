import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { UpdatePublishedDataV4Dto } from "./update-published-data.v4.dto";

describe("UpdatePublishedDataV4Dto", () => {
  it("normalizes null resource ID arrays to empty arrays", () => {
    const dto = plainToInstance(UpdatePublishedDataV4Dto, {
      title: "Example",
      abstract: "Example abstract",
      datasetPids: null,
      proposalIds: null,
      sampleIds: null,
      instrumentIds: null,
    });

    expect(dto.datasetPids).toEqual([]);
    expect(dto.proposalIds).toEqual([]);
    expect(dto.sampleIds).toEqual([]);
    expect(dto.instrumentIds).toEqual([]);
  });

  it("rejects scalar resource IDs for v4", async () => {
    const dto = plainToInstance(UpdatePublishedDataV4Dto, {
      title: "Example",
      abstract: "Example abstract",
      datasetPids: "dataset-1",
    });

    const errors = await validate(dto);

    expect(errors.map((error) => error.property)).toContain("datasetPids");
  });

  it("leaves blank-entry business validation to the resource validation layer", async () => {
    const dto = plainToInstance(UpdatePublishedDataV4Dto, {
      title: "Example",
      abstract: "Example abstract",
      datasetPids: ["", "valid-dataset"],
      proposalIds: ["   "],
      sampleIds: ["\t", "valid-sample"],
      instrumentIds: ["valid-instrument"],
    });

    const errors = await validate(dto);

    expect(errors).toHaveLength(0);
  });

  it("keeps omitted resource ID arrays undefined", () => {
    const dto = plainToInstance(UpdatePublishedDataV4Dto, {
      title: "Example",
      abstract: "Example abstract",
    });

    expect(dto.datasetPids).toBeUndefined();
    expect(dto.proposalIds).toBeUndefined();
    expect(dto.sampleIds).toBeUndefined();
    expect(dto.instrumentIds).toBeUndefined();
  });
});
