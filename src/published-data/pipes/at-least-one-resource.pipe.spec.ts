import { BadRequestException } from "@nestjs/common";
import { AtLeastOneResourcePipe } from "./at-least-one-resource.pipe";

describe("AtLeastOneResourcePipe", () => {
  const pipe = new AtLeastOneResourcePipe();

  it.each([
    ["datasetPids", { datasetPids: ["dataset-1"] }],
    ["proposalIds", { proposalIds: ["proposal-1"] }],
    ["sampleIds", { sampleIds: ["sample-1"] }],
    ["instrumentIds", { instrumentIds: ["instrument-1"] }],
  ])("accepts %s as the only resource field", (_field, value) => {
    expect(pipe.transform(value)).toBe(value);
  });

  it("accepts one valid field alongside empty arrays", () => {
    const value = {
      datasetPids: [],
      proposalIds: ["proposal-1"],
      sampleIds: [],
      instrumentIds: [],
    };

    expect(pipe.transform(value)).toBe(value);
  });

  it.each([
    {},
    { datasetPids: [], proposalIds: [], sampleIds: [], instrumentIds: [] },
    { datasetPids: [""], proposalIds: [], sampleIds: [], instrumentIds: [] },
    { datasetPids: ["  "], proposalIds: [], sampleIds: [], instrumentIds: [] },
    { datasetPids: ["\t"], proposalIds: [], sampleIds: [], instrumentIds: [] },
  ])("rejects a resource set without a non-empty ID: %j", (value) => {
    expect(() => pipe.transform(value)).toThrow(BadRequestException);

    try {
      pipe.transform(value);
    } catch (error) {
      expect(error.getResponse()).toEqual({
        message:
          "At least one of datasetPids, proposalIds, sampleIds, or instrumentIds must contain at least one non-empty element",
        code: "NO_RESOURCE_IDS_PROVIDED",
        requiredFields: [
          "datasetPids",
          "proposalIds",
          "sampleIds",
          "instrumentIds",
        ],
      });
    }
  });

  it("does not throw a TypeError for null input", () => {
    expect(() => pipe.transform(null)).toThrow(BadRequestException);
  });

  it("rejects malformed scalar resource fields with a validation error", () => {
    expect(() => pipe.transform({ proposalIds: "proposal-1" })).toThrow(
      BadRequestException,
    );
  });
});
