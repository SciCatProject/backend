import { MappingObject } from "../interfaces/mappingInterface.type";

export const datasetMappings: MappingObject = {
  description: {
    type: "text",
    analyzer: "autocomplete",
    search_analyzer: "autocomplete_search",
  },
  datasetName: {
    type: "text",
    analyzer: "autocomplete",
    search_analyzer: "autocomplete_search",
  },
  pid: {
    type: "keyword",
    ignore_above: 256,
  },

  isPublished: {
    type: "boolean",
  },
  ownerGroup: {
    type: "keyword",
    ignore_above: 256,
  },
  accessGroups: {
    type: "keyword",
    ignore_above: 256,
  },
};
