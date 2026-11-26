# Spec Delta

## Purpose

Records the original file listing of a dataset (paths, sizes, times, checksums, per-file metadata) and keeps the dataset's size and file count in sync.

## ADDED Requirements

### Requirement: Origdatablock content
An origdatablock SHALL require `datasetId`, integer `size`, and a non-empty `dataFileList` of files each with `path`, `size`, and ISO `time`. `chkAlg`, if given, SHALL be non-empty. It SHALL get a generated UUID id.

#### Scenario: Empty file list
- **WHEN** an origdatablock is created with `dataFileList: []`
- **THEN** the response is 400

### Requirement: File metadata schema
On v3 create/update and v4 create/isValid/update, each file's `metadata` SHALL be validated against the JSON schema from `DATAFILES_METADATA_SCHEMA`; failures SHALL return 400. The default schema SHALL reject any non-empty metadata.

#### Scenario: Default schema
- **WHEN** no schema is configured and a file has `metadata: {"a": 1}`
- **THEN** the response is 400

### Requirement: Create origdatablock
Creation SHALL require that the dataset exists (404 otherwise) and copy `ownerGroup`, `accessGroups`, and `instrumentGroup` from it. v4 SHALL additionally require update permission on the dataset.

#### Scenario: Unknown dataset
- **WHEN** an origdatablock is created with a nonexistent `datasetId`
- **THEN** the response is 404

### Requirement: Dataset size sync
Creating, updating, or deleting an origdatablock SHALL adjust the dataset's `size` and `numberOfFiles` by the change in block size and file count.

#### Scenario: Block added
- **WHEN** a block of size 100 with 2 files is added to a dataset
- **THEN** the dataset's `size` grows by 100 and `numberOfFiles` by 2

### Requirement: Query origdatablocks
Lists SHALL be access-filtered. v4 SHALL accept a whitelisted JSON `filter` (default limit 10, sort `createdAt` desc) with optional `include` of `dataset`, and return 403 to anonymous callers. Both versions SHALL offer per-file views (`/files`, v3 `/fullquery/files`) and facet endpoints.

#### Scenario: Per-file listing
- **WHEN** a user requests `/api/v4/origdatablocks/files`
- **THEN** one row per accessible file is returned with `datasetExist`

### Requirement: Public origdatablocks
`/api/v4/origdatablocks/public` SHALL serve list, files, file count, facets, and get-by-id without authentication, restricted to published blocks for every caller.

#### Scenario: Admin on public route
- **WHEN** an admin lists via the public route
- **THEN** only published blocks are returned

### Requirement: Update and delete
`PATCH /origdatablocks/:id` SHALL partially update and return 412 on stale `If-Unmodified-Since`; v4 SHALL also require dataset update permission. Delete SHALL require `DELETE_GROUPS`, return the deleted block, and return 404 if missing.

#### Scenario: Access-group member patches
- **WHEN** a user with only access-group rights on the dataset patches a block via v4
- **THEN** the response is 403
