export enum Action {
  // "manage" is a special casl term that will work as a wildcard for any action when granted
  // Should only ever be given at admin level
  Manage = "manage",

  // Generic CRUD actions
  Create = "create",
  Read = "read",
  Update = "update",
  Delete = "delete",

  // Generic access any action that can be applied to any resource
  // Currently used by addAccessBasedFilters for admin/special group users
  AccessAny = "access_any",

  // ---------------
  // Special actions for each collection
  // ---------------

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

  // Samples
  SampleAttachmentCreate = "sample_attachment_create",
  SampleAttachmentRead = "sample_attachment_read",
  SampleAttachmentUpdate = "sample_attachment_update",
  SampleAttachmentDelete = "sample_attachment_delete",

  // Users
  UserCreateJwt = "user_create_jwt",
}
