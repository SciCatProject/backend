import { PipelineStage } from "mongoose";
import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";
import { HistoryClass } from "src/datasets/schemas/history.schema";
import { LifecycleClass } from "src/datasets/schemas/lifecycle.schema";
import { RelationshipClass } from "src/datasets/schemas/relationship.schema";
import { TechniqueClass } from "src/datasets/schemas/technique.schema";

export enum DatasetLookupKeysEnum {
  instruments = "instruments",
  proposals = "proposals",
  origdatablocks = "origdatablocks",
  datablocks = "datablocks",
  attachments = "attachments",
  samples = "samples",
  all = "all",
}

export enum DatasetArchiverLookupKeysEnum {
  origdatablocks = "origdatablocks",
  datablocks = "datablocks",
  attachments = "attachments",
}

export const DATASET_LOOKUP_FIELDS: Record<
  DatasetLookupKeysEnum,
  PipelineStage.Lookup | undefined
> = {
  instruments: {
    $lookup: {
      from: "Instrument",
      as: "",
      let: { instrumentIds: { $ifNull: ["$instrumentIds", []] } },
      pipeline: [{ $match: { $expr: { $in: ["$pid", "$$instrumentIds"] } } }],
    },
  },
  proposals: {
    $lookup: {
      from: "Proposal",
      as: "",
      let: { proposalIds: { $ifNull: ["$proposalIds", []] } },
      pipeline: [
        { $match: { $expr: { $in: ["$proposalId", "$$proposalIds"] } } },
      ],
    },
  },
  origdatablocks: {
    $lookup: {
      from: "OrigDatablock",
      as: "",
      let: { pid: "$pid" },
      pipeline: [{ $match: { $expr: { $eq: ["$datasetId", "$$pid"] } } }],
    },
  },
  datablocks: {
    $lookup: {
      from: "Datablock",
      as: "",
      let: { pid: "$pid" },
      pipeline: [{ $match: { $expr: { $eq: ["$datasetId", "$$pid"] } } }],
    },
  },
  attachments: {
    $lookup: {
      from: "Attachment",
      as: "",
      let: { pid: "$pid" },
      pipeline: [
        {
          $match: {
            $expr: {
              $anyElementTrue: {
                $map: {
                  input: { $ifNull: ["$relationships", []] },
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
      ],
    },
  },
  samples: {
    $lookup: {
      from: "Sample",
      as: "",
      let: { sampleIds: { $ifNull: ["$sampleIds", []] } },
      pipeline: [{ $match: { $expr: { $in: ["$sampleId", "$$sampleIds"] } } }],
    },
  },
  all: undefined,
};

// Dataset specific keys that are allowed
export const ALLOWED_DATASET_KEYS = [
  ...Object.keys(new OutputDatasetDto()),
  ...Object.keys(new HistoryClass()),
  ...Object.keys(new LifecycleClass()),
  ...Object.keys(new RelationshipClass()),
  ...Object.keys(new TechniqueClass()),
];

// Allowed keys taken from mongoose QuerySelector.
export const ALLOWED_DATASET_FILTER_KEYS: Record<string, string[]> = {
  where: [
    "where",
    "$in",
    "$or",
    "$and",
    "$nor",
    "$match",
    "$eq",
    "$gt",
    "$gte",
    "$lt",
    "$lte",
    "$ne",
    "$nin",
    "$not",
    "$exists",
    "$regex",
    "$options",
  ],
  include: ["include"],
  limits: ["limits", "limit", "skip", "sort"],
  fields: ["fields"],
};
