export type MappingProperty = Record<string, unknown>;

export interface MappingObject {
  [key: string]: MappingProperty;
}
