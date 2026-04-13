import { searchType } from "./es-common.type";

export interface MappingProperty {
  type: searchType;
  fields?: {
    keyword: {
      type: searchType;
      ignore_above: number;
    };
  };
  [key: string]: unknown;
}

export interface MappingObject {
  [key: string]: MappingProperty;
}
