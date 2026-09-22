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
  // RuntimeConfig
  RuntimeConfigRead = "runtimeconfig_read",
  RuntimeConfigUpdate = "runtimeconfig_update",

  // Samples
  SampleCreate = "sample_create",
  SampleRead = "sample_read",
  SampleUpdate = "sample_update",
  SampleDelete = "sample_delete",

  SampleAttachmentCreate = "sample_attachment_create",
  SampleAttachmentRead = "sample_attachment_read",
  SampleAttachmentUpdate = "sample_attachment_update",
  SampleAttachmentDelete = "sample_attachment_delete",

  // Server-Sent Events
  SseRead = "sse_read",

  // Users
  UserCreate = "user_create",
  UserRead = "user_read",
  UserUpdate = "user_update",
  UserDelete = "user_delete",
  UserCreateJwt = "user_create_jwt",
}
