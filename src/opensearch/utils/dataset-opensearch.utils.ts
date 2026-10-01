// It controlles which fields of the dataset document should be included
// when sending it to Opensearch.
export const DATASET_OPENSEARCH_FIELDS = [
  // auth — filtered on, not searched
  "isPublished",
  "ownerGroup",
  "accessGroups",

  // searchable
  "pid",
  "owner",
  "ownerEmail",
  "contactEmail",
  "sourceFolder",
  "type",
  "keywords",
  "description",
  "datasetName",
  "classification",
  "version",
  "createdBy",
  "updatedBy",
  "creationLocation",
  "proposalIds",
  "instrumentIds",
  "sampleIds",
  "techniques",
  "principalInvestigators",
  "creationTime",
  "createdAt",
  "updatedAt",
  "numberOfFiles",
  "size",
  "datasetlifecycle",
  "scientificMetadata",
] as const;
// OUTPUT EXAMPLE:
// { description: 1, datasetName: 1, isPublished: 1, ownerGroup: 1, accessGroups: 1 }
export const DATASET_OPENSEARCH_PROJECTION = Object.fromEntries(
  DATASET_OPENSEARCH_FIELDS.map((key) => [key, 1]),
);
