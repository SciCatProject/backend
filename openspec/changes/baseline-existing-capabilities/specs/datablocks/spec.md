# Spec Delta

## Purpose

Records how a dataset's files were packed into archive units and keeps the dataset's archived size and file count in sync.

## ADDED Requirements

### Requirement: Datablock content
A datablock SHALL require `datasetId`, `archiveId`, integer `size` and `packedSize`, `version`, and a non-empty `dataFileList`. `archiveId` SHALL be unique; duplicates via `/api/v3/datablocks` SHALL return 409.

#### Scenario: Duplicate archiveId
- **WHEN** a datablock is created with an existing `archiveId`
- **THEN** the response is 409

### Requirement: Create datablock
`POST /api/v3/datablocks` SHALL require an existing dataset (404 otherwise) and datablock-create permission on it, and copy its `ownerGroup` and `accessGroups`.

#### Scenario: Dataset of another group
- **WHEN** a user creates a datablock for a dataset they do not own
- **THEN** the response is 403

### Requirement: Archived size sync
Creating, updating, or deleting a datablock SHALL adjust the dataset's `packedSize` and `numberOfFilesArchived` by the change in block `packedSize` and file count. Dataset `size` and `numberOfFiles` SHALL NOT change.

#### Scenario: Datablock added
- **WHEN** a datablock with `packedSize` 50 and 3 files is added
- **THEN** the dataset's `packedSize` grows by 50 and `numberOfFilesArchived` by 3

### Requirement: Query datablocks
`GET /api/v3/datablocks` and `/count` SHALL accept Loopback-style filters and be access-filtered (anonymous: published only). `GET /:id` SHALL return 404 if missing and 403 if unreadable.

#### Scenario: Count
- **WHEN** a user calls `GET /api/v3/datablocks/count`
- **THEN** `{ count }` of accessible datablocks is returned

### Requirement: Update and delete
`PATCH /api/v3/datablocks/:id` SHALL require update permission on the block and dataset. Delete SHALL require `DELETE_GROUPS` and return the deleted block. Missing blocks SHALL return 404.

#### Scenario: Delete by archive manager
- **WHEN** a `DELETE_GROUPS` member deletes a datablock
- **THEN** the deleted block is returned and dataset counters decrease

### Requirement: Dataset-scoped datablocks
`/api/v3/datasets/:pid/datablocks` SHALL support create, list, count, update, delete one, and delete all. Delete all SHALL return `{ count }` and reset the dataset's `packedSize` and `numberOfFilesArchived` to 0.

#### Scenario: Delete all
- **WHEN** an authorized user deletes all datablocks of a dataset
- **THEN** the dataset's `packedSize` is 0
