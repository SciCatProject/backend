export type ResourceIdArray = string[] | null | undefined;

export interface ResourceIdFields {
  datasetPids?: ResourceIdArray;
  proposalIds?: ResourceIdArray;
  sampleIds?: ResourceIdArray;
  instrumentIds?: ResourceIdArray;
}

export const RESOURCE_ID_FIELD_NAMES = [
  "datasetPids",
  "proposalIds",
  "sampleIds",
  "instrumentIds",
] as const;

export const NO_RESOURCE_IDS_PROVIDED_CODE = "NO_RESOURCE_IDS_PROVIDED";
export const NO_RESOURCE_IDS_PROVIDED_MESSAGE =
  "At least one of datasetPids, proposalIds, sampleIds, or instrumentIds must contain at least one non-empty element";

export function createNoResourceIdsProvidedError() {
  return {
    message: NO_RESOURCE_IDS_PROVIDED_MESSAGE,
    code: NO_RESOURCE_IDS_PROVIDED_CODE,
    requiredFields: [...RESOURCE_ID_FIELD_NAMES],
  };
}

export function normalizeResourceIdArrays<T extends ResourceIdFields>(
  value: T,
): T {
  const normalized = { ...value };

  for (const field of RESOURCE_ID_FIELD_NAMES) {
    if (normalized[field] === null) {
      normalized[field] = [];
    }
  }

  return normalized;
}

export function hasOnlyNonBlankResourceIds(value: ResourceIdFields): boolean {
  return RESOURCE_ID_FIELD_NAMES.every((field) => {
    const ids = value?.[field];
    return (
      ids === undefined ||
      (Array.isArray(ids) &&
        ids.every((id) => typeof id === "string" && id.trim().length > 0))
    );
  });
}

export function hasOnlyBlankResourceIds(value: ResourceIdFields): boolean {
  return (
    !hasAtLeastOneResourceId(value) &&
    RESOURCE_ID_FIELD_NAMES.every((field) => {
      const ids = value?.[field];
      return (
        ids === undefined ||
        (Array.isArray(ids) &&
          ids.every((id) => typeof id === "string" && id.trim().length === 0))
      );
    })
  );
}

export function hasAtLeastOneResourceId(value: ResourceIdFields): boolean {
  return RESOURCE_ID_FIELD_NAMES.some((field) => {
    const ids = value?.[field];
    return (
      Array.isArray(ids) &&
      ids.some((id) => typeof id === "string" && id.trim() !== "")
    );
  });
}
