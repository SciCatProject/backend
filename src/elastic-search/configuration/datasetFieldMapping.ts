import { MappingObject } from "../interfaces/mappingInterface.type";

export const datasetMappings: MappingObject = {
  description: {
    type: "text",
    analyzer: "autocomplete",
    search_analyzer: "autocomplete_search",
    fields: {
      keyword: {
        type: "keyword",
        ignore_above: 256,
      },
    },
  },
  datasetName: {
    type: "text",
    analyzer: "autocomplete",
    search_analyzer: "autocomplete_search",
    fields: {
      keyword: {
        type: "keyword",
        ignore_above: 256,
      },
    },
  },
  pid: {
    type: "keyword",
    ignore_above: 256,
  },
  creationTime: {
    type: "date",
  },
  endTime: {
    type: "date",
  },
  scientificMetadata: {
    type: "nested",
    dynamic: true,
    properties: {},
  },
  history: {
    type: "nested",
    dynamic: false,
  },
  proposalIds: {
    type: "keyword",
    ignore_above: 256,
  },
  sampleIds: {
    type: "keyword",
    ignore_above: 256,
  },
  instrumentIds: {
    type: "keyword",
    ignore_above: 256,
  },
  sourceFolder: {
    type: "keyword",
    ignore_above: 256,
  },
  isPublished: {
    type: "boolean",
  },
  type: {
    type: "keyword",
    ignore_above: 256,
  },
  keywords: {
    type: "keyword",
    ignore_above: 256,
  },
  creationLocation: {
    type: "keyword",
    ignore_above: 256,
  },
  ownerGroup: {
    type: "keyword",
    ignore_above: 256,
  },
  accessGroups: {
    type: "keyword",
    ignore_above: 256,
  },
  sharedWith: {
    type: "keyword",
    ignore_above: 256,
  },
  ownerEmail: {
    type: "keyword",
    ignore_above: 256,
  },
  size: {
    type: "long",
  },
  runNumber: {
    type: "keyword",
    ignore_above: 256,
  },
  // NOTE: below fields are for backward compatibility
  // and should be removed when obsolete dto is removed
  proposalId: {
    type: "keyword",
    ignore_above: 256,
  },
  sampleId: {
    type: "keyword",
    ignore_above: 256,
  },
  instrumentId: {
    type: "keyword",
    ignore_above: 256,
  },
};
