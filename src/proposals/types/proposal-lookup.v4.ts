import { PipelineStage } from "mongoose";
import { ProposalClass } from "../schemas/proposal.schema";

export enum ProposalLookupKeysEnumV4 {
  samples = "samples",
  all = "all",
}

export const PROPOSAL_LOOKUP_FIELDS_V4: Record<
  ProposalLookupKeysEnumV4,
  PipelineStage.Lookup | undefined
> = {
  samples: {
    $lookup: {
      from: "Sample",
      as: "",
      let: { proposalId: "$proposalId" },
      pipeline: [
        { $match: { $expr: { $eq: ["$proposalId", "$$proposalId"] } } },
      ],
    },
  },
  all: undefined,
};

export const ALLOWED_PROPOSAL_KEYS_V4 = [...Object.keys(new ProposalClass())];

export const ALLOWED_PROPOSAL_FILTER_KEYS_V4: Record<string, string[]> = {
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
