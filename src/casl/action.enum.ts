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

  // Instruments
  InstrumentCreate = "instrument_create",
  InstrumentRead = "instrument_read",
  InstrumentUpdate = "instrument_update",
  InstrumentDelete = "instrument_delete",

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

  // Users
  UserCreate = "user_create",
  UserRead = "user_read",
  UserUpdate = "user_update",
  UserDelete = "user_delete",
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

  // --------------
  // Jobs
  // --------------
  // endpoint authorization
  JobCreate = "jobs_create",
  JobRead = "jobs_read",
  JobUpdate = "job_update",
  JobDelete = "job_delete",
  // data instance authorization
  JobCreateConfiguration = "job_create_configuration",
  JobCreateOwner = "job_create_owner",
  JobCreateAny = "job_create_any",
  JobReadAccess = "job_read_access",
  JobReadAny = "job_read_any",
  JobUpdateConfiguration = "job_update_configuration",
  JobUpdateOwner = "job_update_owner",
  JobUpdateAny = "job_update_any",
  //JobDeleteAny = "job_delete_any",

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

  // -------------------------------------
  // RuntimeConfig
  // -------------------------------------
  // runtimeconfig endpoint authorization
  RuntimeConfigReadEndpoint = "runtimeconfig_read_endpoint",
  RuntimeConfigUpdateEndpoint = "runtimeconfig_update_endpoint",
}
