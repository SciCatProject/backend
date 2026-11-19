import { PipelineStage } from "mongoose";
import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";
import { HistoryClass } from "src/datasets/schemas/history.schema";
import { LifecycleClass } from "src/datasets/schemas/lifecycle.schema";
import { RelationshipClass } from "src/datasets/schemas/relationship.schema";
import { TechniqueClass } from "src/datasets/schemas/technique.schema";
import { ALLOWED_ATTACHMENT_KEYS } from "src/attachments/types/attachment-lookup";
import { DataFile } from "src/common/schemas/datafile.schema";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { ALLOWED_ORIGDATABLOCK_KEYS } from "src/origdatablocks/types/origdatablock-lookup";
import { ALLOWED_PROPOSAL_KEYS } from "src/proposals/types/proposal-lookup";
import { SampleClass } from "src/samples/schemas/sample.schema";

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
      localField: "instrumentIds",
      foreignField: "pid",
    },
  },
  proposals: {
    $lookup: {
      from: "Proposal",
      as: "",
      localField: "proposalIds",
      foreignField: "proposalId",
    },
  },
  origdatablocks: {
    $lookup: {
      from: "OrigDatablock",
      as: "",
      localField: "pid",
      foreignField: "datasetId",
    },
  },
  datablocks: {
    $lookup: {
      from: "Datablock",
      as: "",
      localField: "pid",
      foreignField: "datasetId",
    },
  },
  attachments: {
    $lookup: {
      from: "Attachment",
      as: "",
      localField: "pid",
      foreignField: "relationships.targetId",
      let: { pid: "$pid" },
      pipeline: [
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
      ],
    },
  },
  samples: {
    $lookup: {
      from: "Sample",
      as: "",
      localField: "sampleIds",
      foreignField: "sampleId",
    },
  },
  all: undefined,
};

export const DATASET_RELATIONS = Object.keys(DATASET_LOOKUP_FIELDS).filter(
  (field) => field !== DatasetLookupKeysEnum.all,
) as DatasetLookupKeysEnum[];

// Keys of the related documents that where conditions on relations may use
export const DATASET_RELATION_KEYS: Record<string, string[]> = {
  instruments: Object.keys(new Instrument()),
  proposals: ALLOWED_PROPOSAL_KEYS,
  origdatablocks: ALLOWED_ORIGDATABLOCK_KEYS,
  datablocks: [...Object.keys(new Datablock()), ...Object.keys(new DataFile())],
  attachments: ALLOWED_ATTACHMENT_KEYS,
  samples: Object.keys(new SampleClass()),
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
    "$elemMatch",
    "$exists",
    "$regex",
    "$options",
    "$text",
    "$search",
    "$date",
  ],
  include: ["include"],
  limits: ["limits", "limit", "skip", "sort"],
  fields: ["fields"],
};
