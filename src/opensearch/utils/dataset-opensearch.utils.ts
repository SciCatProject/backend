// It controlles which fields of the dataset document should be included
// when sending it to Opensearch.
export const DATASET_OPENSEARCH_FIELDS = [
  "pid",
  "description",
  "datasetName",
  "isPublished",
  "ownerGroup",
  "accessGroups",
] as const;

// OUTPUT EXAMPLE:
// { description: 1, datasetName: 1, isPublished: 1, ownerGroup: 1, accessGroups: 1 }
export const DATASET_OPENSEARCH_PROJECTION = Object.fromEntries(
  DATASET_OPENSEARCH_FIELDS.map((key) => [key, 1]),
);
