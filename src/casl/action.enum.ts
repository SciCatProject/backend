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

  // Jobs
  JobCreate = "jobs_create",
  JobRead = "jobs_read",
  JobUpdate = "job_update",
  JobDelete = "job_delete",

  // ---------------
  // Attachments
  AttachmentCreate = "attachment_create",
  AttachmentRead = "attachment_read",
  AttachmentUpdate = "attachment_update",
  AttachmentDelete = "attachment_delete",

  // Datablock
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

  // Instruments
  InstrumentCreate = "instrument_create",
  InstrumentRead = "instrument_read",
  InstrumentUpdate = "instrument_update",
  InstrumentDelete = "instrument_delete",

  // MetadataKeys
  MetadataKeyRead = "metadatakey_read",

  // Origdatablock
  OrigdatablockCreate = "origdatablock_create",
  OrigdatablockRead = "origdatablock_read",
  OrigdatablockUpdate = "origdatablock_update",
  OrigdatablockDelete = "origdatablock_delete",

  // Proposals
  ProposalCreate = "proposal_create",
  ProposalRead = "proposal_read",
  ProposalUpdate = "proposal_update",
  ProposalDelete = "proposal_delete",

  ProposalAttachmentCreate = "proposal_attachment_create",
  ProposalAttachmentRead = "proposal_attachment_read",
  ProposalAttachmentUpdate = "proposal_attachment_update",
  ProposalAttachmentDelete = "proposal_attachment_delete",

  ProposalDatasetRead = "proposal_dataset_read",

  // RuntimeConfig
  RuntimeConfigRead = "runtimeconfig_read",
  RuntimeConfigUpdate = "runtimeconfig_update",

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

  // -------------
  // Users actions
  UserReadOwn = "user_read_own",
  UserReadAny = "user_read_any",
  UserCreateOwn = "user_create_own",
  UserCreateAny = "user_create_any",
  UserUpdateOwn = "user_update_own",
  UserUpdateAny = "user_update_any",
  UserDeleteOwn = "user_delete_own",
  UserDeleteAny = "user_delete_any",
  UserCreateJwt = "user_create_jwt",
  UserListAll = "user_list_all",
  UserListOwn = "user_list_own",

  // -------------------------------------
  // History
  // -------------------------------------
  // endpoint authorization
  HistoryReadEndpoint = "history_read_endpoint", // General history endpoint access

  // instance authorization by collection
  HistoryReadDataset = "history_read_dataset",
  HistoryReadProposal = "history_read_proposal",
  HistoryReadSample = "history_read_sample",
  HistoryReadInstrument = "history_read_instrument",
  HistoryReadPublishedData = "history_read_published_data",
  HistoryReadPolicy = "history_read_policy",
  HistoryReadDatablock = "history_read_datablock",
  HistoryReadAttachment = "history_read_attachment",
}
