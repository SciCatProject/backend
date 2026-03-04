export enum FilterFields {
  Keywords = "keywords",
  Pid = "pid",
  Type = "type",
  CreationLocation = "creationLocation",
  CreationTime = "creationTime",
  OwnerGroup = "ownerGroup",
  AccessGroups = "accessGroups",
  ScientificMetadata = "scientific",
  IsPublished = "isPublished",
  DatasetName = "datasetName",
  Mode = "mode",
}

export enum MustFields {
  DatasetName = "datasetName",
  Description = "description",
}

export enum ShouldFields {
  SharedWith = "sharedWith",
  UserGroups = "userGroups",
}

export enum FacetFields {
  Type = "type",
  CreationLocation = "creationLocation",
  OwnerGroup = "ownerGroup",
  AccessGroups = "accessGroups",
  Keywords = "keywords",
}

export enum SortFields {
  DatasetName = "datasetName",
  DatasetNameKeyword = "datasetName.keyword",
  ScientificMetadata = "scientificMetadata",
  ScientificMetadataRunNumberValue = "scientificMetadata.runnumber.value",
}
