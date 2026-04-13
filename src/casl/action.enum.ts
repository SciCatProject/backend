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
  accessAny = "access_any",

  // ---------------
  // Datasets
  // endpoint authorization actions
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
  // data instance actions
  DatasetCreateOwnerNoPid = "dataset_create_owner_no_pid",
  DatasetCreateOwnerWithPid = "dataset_create_owner_with_pid",
  DatasetCreateAny = "dataset_create_any",
  DatasetReadManyPublic = "dataset_read_many_public",
  DatasetReadManyAccess = "dataset_read_many_access",
  DatasetReadManyOwner = "dataset_read_many_owner",
  DatasetReadOnePublic = "dataset_read_one_public",
  DatasetReadOneAccess = "dataset_read_one_access",
  DatasetReadOneOwner = "dataset_read_one_owner",
  DatasetReadAny = "dataset_read_any",
  DatasetUpdateOwner = "dataset_update_owner",
  DatasetUpdateAny = "dataset_update_any",
  DatasetDeleteOwner = "dataset_delete_owner",
  DatasetDeleteAny = "dataset_delete_any",
  DatasetLifecycleUpdateAny = "dataset_lifecycle_update_any",
  DatasetAttachmentCreateOwner = "dataset_attachment_create_owner",
  DatasetAttachmentCreateAny = "dataset_attachment_create_any",
  DatasetAttachmentReadPublic = "dataset_attachment_read_public",
  DatasetAttachmentReadAccess = "dataset_attachment_read_access",
  DatasetAttachmentReadOwner = "dataset_attachment_read_owner",
  DatasetAttachmentReadAny = "dataset_attachment_read_any",
  DatasetAttachmentUpdateOwner = "dataset_attachment_update_owner",
  DatasetAttachmentUpdateAny = "dataset_attachment_update_any",
  DatasetAttachmentDeleteOwner = "dataset_attachment_delete_owner",
  DatasetAttachmentDeleteAny = "dataset_attachment_delete_any",
  DatasetOrigdatablockCreateOwner = "dataset_origdatablock_create_owner",
  DatasetOrigdatablockCreateAny = "dataset_origdatablock_create_any",
  DatasetOrigdatablockReadPublic = "dataset_origdatablock_read_public",
  DatasetOrigdatablockReadAccess = "dataset_origdatablock_read_access",
  DatasetOrigdatablockReadOwner = "dataset_origdatablock_read_owner",
  DatasetOrigdatablockReadAny = "dataset_origdatablock_read_any",
  DatasetOrigdatablockUpdateOwner = "dataset_origdatablock_update_owner",
  DatasetOrigdatablockUpdateAny = "dataset_origdatablock_update_any",
  DatasetOrigdatablockDeleteOwner = "dataset_origdatablock_delete_owner",
  DatasetOrigdatablockDeleteAny = "dataset_origdatablock_delete_any",
  DatasetDatablockCreateOwner = "dataset_datablock_create_owner",
  DatasetDatablockCreateAny = "dataset_datablock_create_any",
  DatasetDatablockReadPublic = "dataset_datablock_read_public",
  DatasetDatablockReadAccess = "dataset_datablock_read_access",
  DatasetDatablockReadOwner = "dataset_datablock_read_owner",
  DatasetDatablockReadAny = "dataset_datablock_read_any",
  DatasetDatablockUpdateOwner = "dataset_datablock_update_owner",
  DatasetDatablockUpdateAny = "dataset_datablock_update_any",
  DatasetDatablockDeleteOwner = "dataset_datablock_delete_owner",
  DatasetDatablockDeleteAny = "dataset_datablock_delete_any",
  DatasetLogbookReadOwner = "dataset_logbook_read_owner",
  DatasetLogbookReadAny = "dataset_logbook_read_any",
  //
  // -------------
  // Origdatablock
  // endpoint authorization actions
  OrigdatablockCreate = "origdatablock_create",
  OrigdatablockRead = "origdatablock_read",
  OrigdatablockUpdate = "origdatablock_update",
  OrigdatablockDelete = "origdatablock_delete",
  // individual actions
  OrigdatablockCreateOwner = "origdatablock_create_owner",
  OrigdatablockCreateAny = "origdatablock_create_any",
  OrigdatablockReadManyPublic = "origdatablock_read_many_public",
  OrigdatablockReadManyAccess = "origdatablock_read_many_access",
  OrigdatablockReadManyOwner = "origdatablock_read_many_owner",
  OrigdatablockReadOnePublic = "origdatablock_read_one_public",
  OrigdatablockReadOneAccess = "origdatablock_read_one_access",
  OrigdatablockReadOneOwner = "origdatablock_read_one_owner",
  OrigdatablockReadAny = "origdatablock_read_any",
  OrigdatablockUpdateOwner = "origdatablock_update_owner",
  OrigdatablockUpdateAny = "origdatablock_update_any",
  OrigdatablockDeleteOwner = "origdatablock_delete_owner",
  OrigdatablockDeleteAny = "origdatablock_delete_any",

  // -------------
  // Datablock
  // endpoint authorization actions
  DatablockCreateEndpoint = "datablock_create_endpoint",
  DatablockReadEndpoint = "datablock_read_endpoint",
  DatablockUpdateEndpoint = "datablock_update_endpoint",
  DatablockDeleteEndpoint = "datablock_delete_endpoint",
  // individual actions
  DatablockCreateInstance = "datablock_create_instance",
  DatablockReadInstance = "datablock_read_instance",
  DatablockUpdateInstance = "datablock_update_instance",
  // admin actions
  DatablockReadAny = "datablock_read_any",
  DatablockUpdateAny = "datablock_update_any",
  DatablockDeleteAny = "datablock_delete_any",

  // Proposals
  // endpoint authorization actions
  ProposalsCreate = "proposals_create",
  ProposalsRead = "proposals_read",
  ProposalsUpdate = "proposals_update",
  ProposalsDelete = "proposals_delete",
  ProposalsAttachmentCreate = "proposals_attachment_create",
  ProposalsAttachmentRead = "proposals_attachment_read",
  ProposalsAttachmentUpdate = "proposals_attachment_update",
  ProposalsAttachmentDelete = "proposals_attachment_delete",
  ProposalsDatasetRead = "proposals_dataset_read",

  // individual actions
  ProposalsCreateOwner = "proposals_create_owner",
  ProposalsCreateAny = "proposals_create_any",
  ProposalsReadManyPublic = "proposals_read_many_public",
  ProposalsReadManyAccess = "proposals_read_many_access",
  ProposalsReadManyOwner = "proposals_read_many_owner",
  ProposalsReadOnePublic = "proposals_read_one_public",
  ProposalsReadOneAccess = "proposals_read_one_access",
  ProposalsReadOneOwner = "proposals_read_one_owner",
  ProposalsReadAny = "proposals_read_any",
  ProposalsUpdateOwner = "proposals_update_owner",
  ProposalsUpdateAny = "proposals_update_any",
  ProposalsDeleteOwner = "proposals_delete_owner",
  ProposalsDeleteAny = "proposals_delete_any",
  ProposalsAttachmentCreateOwner = "proposals_attachment_create_owner",
  ProposalsAttachmentCreateAny = "proposals_attachment_create_any",
  ProposalsAttachmentReadPublic = "proposals_attachment_read_public",
  ProposalsAttachmentReadAccess = "proposals_attachment_read_access",
  ProposalsAttachmentReadOwner = "proposals_attachment_read_owner",
  ProposalsAttachmentReadAny = "proposals_attachment_read_any",
  ProposalsAttachmentUpdateOwner = "proposals_attachment_update_owner",
  ProposalsAttachmentUpdateAny = "proposals_attachment_update_any",
  ProposalsAttachmentDeleteOwner = "proposals_attachment_delete_owner",
  ProposalsAttachmentDeleteAny = "proposals_attachment_delete_any",

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
  // Instrument actions
  InstrumentRead = "instrument_read",
  InstrumentUpdate = "instrument_update",
  InstrumentCreate = "instrument_create",
  InstrumentDelete = "instrument_delete",

  // -------------------------------------
  // Attachment
  // -------------------------------------
  // attachment endpoint authorization
  AttachmentCreateEndpoint = "attachment_create_endpoint",
  AttachmentReadEndpoint = "attachment_read_endpoint",
  AttachmentUpdateEndpoint = "attachment_update_endpoint",
  AttachmentDeleteEndpoint = "attachment_delete_endpoint",
  // -------------------------------------
  // attachment data instance authorization
  AttachmentCreateInstance = "attachment_create_instance",
  AttachmentReadInstance = "attachment_read_instance",
  AttachmentUpdateInstance = "attachment_update_instance",
  AttachmentDeleteInstance = "attachment_delete_instance",

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
