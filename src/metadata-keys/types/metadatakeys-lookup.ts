import { PipelineStage } from "mongoose";
import { OutputMetadataKeyDto } from "../dto/output-metadata-key.dto";

export enum MetadataKeysLookupKeysEnum {}

export const METADATA_KEYS_LOOKUP_FIELDS: Record<
  MetadataKeysLookupKeysEnum,
  PipelineStage.Lookup | undefined
> = {};

// Metadata keys specific keys that are allowed
export const ALLOWED_METADATAKEYS_KEYS = [
  ...Object.keys(new OutputMetadataKeyDto()),
];

// Allowed keys taken from mongoose QuerySelector.
export const ALLOWED_METADATAKEYS_FILTER_KEYS: Record<string, string[]> = {
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
    "$elemMatch",
  ],
  include: [],
  limits: ["limits", "limit", "skip", "sort"],
  fields: ["fields"],
};
