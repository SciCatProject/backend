// It controlles which fields of the dataset document should be excluded
// when sending it to Opensearch.
const DATASET_OPENSEARCH_EXCLUDED_FIELDS = [
  "scientificMetadata",
  "history",
  "datasetlifecycle",
] as const;

// OUTPUT EXAMPLE:
// DATASET_OPENSEARCH_EXCLUDED_FIELDS[0] // "scientificMetadata"
// DATASET_OPENSEARCH_EXCLUDED_FIELDS[1] // "history" ...etc
type ExcludedDatasetField = (typeof DATASET_OPENSEARCH_EXCLUDED_FIELDS)[number];

// OUTPUT EXAMPLE:
// { scientificMetadata: 0, history: 0, datasetlifecycle: 0 }
export const DATASET_OPENSEARCH_EXCLUDE_FIELDS_QUERY = Object.fromEntries(
  DATASET_OPENSEARCH_EXCLUDED_FIELDS.map((field) => [field, 0]),
) as Record<ExcludedDatasetField, 0>;

// It removes the fields that are defined in DATASET_OPENSEARCH_EXCLUDED_FIELDS
// from the given document before sending it to Opensearch.
export function sanitizeDatasetForOpensearch<T extends object>(
  doc: T,
): Omit<T, ExcludedDatasetField> {
  const result = { ...doc } as Record<string, unknown>;
  for (const field of DATASET_OPENSEARCH_EXCLUDED_FIELDS) {
    delete result[field];
  }

  return result as Omit<T, ExcludedDatasetField>;
}
