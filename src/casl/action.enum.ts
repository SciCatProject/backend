export enum Action {
  Manage = "manage",
  Create = "create",
  Read = "read",
  ReadOwn = "readown",
  ReadAll = "readall",
  Update = "update",
  Delete = "delete",
  ListOwn = "listown",
  ListAll = "listall",
  // ---------------
  // Generic access any action that can be applied to any resource
  // Currently used by addAccessBasedFilters for admin/special group users
  AccessAny = "access_any",

  // ---------------
  // Attachments
  AttachmentCreate = "attachment_create",
  AttachmentRead = "attachment_read",
  AttachmentUpdate = "attachment_update",
  AttachmentDelete = "attachment_delete",

  // Datablocks
  DatablockCreate = "datablock_create",
  DatablockRead = "datablock_read",
  DatablockUpdate = "datablock_update",
  DatablockDelete = "datablock_delete",

  // Datasets
  DatasetCreate = "dataset_create",
  DatasetRead = "dataset_read",
  DatasetUpdate = "dataset_update",
  DatasetDelete = "dataset_delete",
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

  // Instruments
  InstrumentCreate = "instrument_create",
  InstrumentRead = "instrument_read",
  InstrumentUpdate = "instrument_update",
  InstrumentDelete = "instrument_delete",

  // Jobs
  JobCreate = "jobs_create",
  JobRead = "jobs_read",
  JobUpdate = "job_update",
  JobDelete = "job_delete",

  // MetadataKeys
  MetadataKeysRead = "metadatakeys_read",

  // Origdatablock
  OrigdatablockCreate = "origdatablock_create",
  OrigdatablockRead = "origdatablock_read",
  OrigdatablockUpdate = "origdatablock_update",
  OrigdatablockDelete = "origdatablock_delete",

  // Proposals
  ProposalCreate = "proposals_create",
  ProposalRead = "proposals_read",
  ProposalUpdate = "proposals_update",
  ProposalDelete = "proposals_delete",
  ProposalAttachmentCreate = "proposals_attachment_create",
  ProposalAttachmentRead = "proposals_attachment_read",
  ProposalAttachmentUpdate = "proposals_attachment_update",
  ProposalAttachmentDelete = "proposals_attachment_delete",
  ProposalDatasetRead = "proposals_dataset_read",

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

  // Users
  UserCreate = "user_create",
  UserRead = "user_read",
  UserUpdate = "user_update",
  UserDelete = "user_delete",
  UserCreateJwt = "user_create_jwt",
}
