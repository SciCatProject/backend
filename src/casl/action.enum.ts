export enum Action {
  Manage = "manage",
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",

  // ---------------
  // Generic access any action that can be applied to any resource
  // Currently used by addAccessBasedFilters for admin/special group users
  AccessAny = "access_any",

  // Datasets
  DatasetLifecycleUpdate = "dataset_lifecycle_update",

  DatasetAttachmentCreate = "dataset_attachment_create",
  DatasetAttachmentRead = "dataset_attachment_read",
  DatasetAttachmentUpdate = "dataset_attachment_update",
  DatasetAttachmentDelete = "dataset_attachment_delete",

  DatasetOrigdatablockCreate = "dataset_origdatablock_create",
  DatasetOrigdatablockRead = "dataset_origdatablock_read",
  DatasetOrigdatablockUpdate = "dataset_origdatablock_update",
  DatasetOrigdatablockDelete = "dataset_origdatablock_delete",

  DatasetDatablockCreate = "dataset_datablock_create",
  DatasetDatablockRead = "dataset_datablock_read",
  DatasetDatablockUpdate = "dataset_datablock_update",
  DatasetDatablockDelete = "dataset_datablock_delete",

  DatasetLogbookRead = "dataset_logbook_read",

  // History
  HistoryRead = "history_read",

  // Proposals
  ProposalAttachmentCreate = "proposal_attachment_create",
  ProposalAttachmentRead = "proposal_attachment_read",
  ProposalAttachmentUpdate = "proposal_attachment_update",
  ProposalAttachmentDelete = "proposal_attachment_delete",

  ProposalDatasetRead = "proposal_dataset_read",

  // Users
  UserCreateJwt = "user_create_jwt",

  // -------------------------------------
  // Samples
  // -------------------------------------
  // sample endpoint authorization
  SampleCreate = "sample_create",
  SampleRead = "sample_read",
  SampleUpdate = "sample_update",
  SampleDelete = "sample_delete",
  SampleAttachmentCreate = "sample_attachment_create",
  SampleAttachmentRead = "sample_attachment_read",
  SampleAttachmentUpdate = "sample_attachment_update",
  SampleAttachmentDelete = "sample_attachment_delete",
  SampleDatasetRead = "sample_dataset_read",
  // -------------------------------------
  // sample data instance authorization
  SampleCreateOwner = "sample_create_owner",
  SampleCreateAny = "sample_create_any",
  SampleReadManyPublic = "sample_read_many_public",
  SampleReadManyAccess = "sample_read_many_access",
  SampleReadManyOwner = "sample_read_many_owner",
  SampleReadOnePublic = "sample_read_one_public",
  SampleReadOneAccess = "sample_read_one_access",
  SampleReadOneOwner = "sample_read_one_owner",
  SampleReadAny = "sample_read_any",

  SampleUpdateOwner = "sample_update_owner",
  SampleUpdateAny = "sample_update_any",
  SampleDeleteOwner = "sample_delete_owner",
  SampleDeleteAny = "sample_delete_any",
  SampleAttachmentCreateOwner = "sample_attachment_create_owner",
  SampleAttachmentCreateAny = "sample_attachment_create_any",
  SampleAttachmentReadPublic = "sample_attachment_read_public",
  SampleAttachmentReadAccess = "sample_attachment_read_access",
  SampleAttachmentReadOwner = "sample_attachment_read_owner",
  SampleAttachmentReadAny = "sample_attachment_read_any",
  SampleAttachmentUpdateOwner = "sample_attachment_update_owner",
  SampleAttachmentUpdateAny = "sample_attachment_update_any",
  SampleAttachmentDeleteOwner = "sample_attachment_delete_owner",
  SampleAttachmentDeleteAny = "sample_attachment_delete_any",
}
