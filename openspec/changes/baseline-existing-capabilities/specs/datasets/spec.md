# Spec Delta

## Purpose

Stores and serves datasets (raw, derived, or custom types) with scientific metadata, lifecycle state, and links to proposals, samples, instruments, and files, via v3, v4, and public v4 APIs.

## ADDED Requirements

### Requirement: Dataset identifiers
A dataset SHALL get pid `<PID_PREFIX>/<uuid>` when none is supplied, used as its id. A supplied pid SHALL require pid-creation rights and, when `DATASET_CREATION_VALIDATION_ENABLED` and `DATASET_CREATION_VALIDATION_REGEX` are set, SHALL match the regex, else 400. A duplicate pid SHALL return 409.

#### Scenario: Pid fails regex
- **WHEN** validation is enabled and a v4 dataset is created with a non-matching pid
- **THEN** the response is 400 "PID is not following required standards"

### Requirement: Create validation (v4)
`POST /api/v4/datasets` SHALL require `ownerGroup`, `contactEmail` (one or `;`-separated emails), `sourceFolder`, `creationTime` (ISO date), `datasetName`, and `type`, and SHALL reject unknown properties with 400. Any `type` string SHALL be accepted.

#### Scenario: Unknown property
- **WHEN** a v4 dataset is posted with a `history` field
- **THEN** the response is 400

### Requirement: Create validation (v3)
`POST /api/v3/datasets` SHALL validate by type: `raw` requires `principalInvestigator` and `creationLocation`; `derived` requires `investigator`, `inputDatasets`, and `usedSoftware`. When `DATASET_TYPES_FILE` defines types, other types SHALL be rejected with 400 "Invalid dataset type!".

#### Scenario: Derived missing software
- **WHEN** a v3 derived dataset is posted without `usedSoftware`
- **THEN** the response is 400

### Requirement: Defaults on create
The system SHALL set `createdBy`/`updatedBy`, `version` (`3` or `4` by route), zero `size`/`packedSize`/file counts, empty `scientificMetadata`, and lifecycle defaults (`archivable` true, `retrievable` false, `archiveStatusMessage` `datasetCreated`, `dateOfPublishing` = now + `POLICY_PUBLICATION_SHIFT` years). Trailing `/` SHALL be stripped from `sourceFolder`.

#### Scenario: New dataset lifecycle
- **WHEN** a dataset is created without `datasetlifecycle`
- **THEN** its lifecycle has `archiveStatusMessage: "datasetCreated"`

### Requirement: Scientific metadata handling
Metadata keys containing dots SHALL round-trip unchanged. Entries with `value` and `unit` SHALL get computed `valueSI` and `unitSI`, overriding client values. When `scientificMetadataSchema` is set, the system SHALL fetch it and set `scientificMetadataValid` without rejecting the request.

#### Scenario: Schema mismatch
- **WHEN** a dataset's metadata does not satisfy its referenced schema
- **THEN** the dataset is saved with `scientificMetadataValid: false`

### Requirement: Validate without saving
`POST /datasets/isValid` SHALL return 200 `{ valid }` (v3 adds an `error` text) without storing, and SHALL require create permission for the body.

#### Scenario: Invalid body
- **WHEN** an incomplete dataset is validated
- **THEN** the response is `{ valid: false }`

### Requirement: Query datasets (v4)
`GET /api/v4/datasets`, `/findOne`, `/count`, `/fullfacet`, and `/metadataKeys` SHALL take a JSON `filter` with `where`, `include`, `fields`, `limits`, allowing only dataset fields and whitelisted operators (400 otherwise). Defaults SHALL be limit 10, sort `createdAt` desc. `findOne` with no match SHALL return `{}`.

#### Scenario: Disallowed operator
- **WHEN** a v4 filter uses `$where`
- **THEN** the response is 400

### Requirement: Included relations (v4)
v4 `include` SHALL accept `instruments`, `proposals`, `origdatablocks`, `datablocks`, `attachments`, `samples`, or `all`, each optionally scoped with `where`, `fields`, `limits`. Included records SHALL be filtered by the caller's access to each related type. Unknown relations SHALL return 400.

#### Scenario: Inaccessible sample
- **WHEN** a user includes `samples` of a readable dataset whose sample they cannot read
- **THEN** that sample is omitted

### Requirement: Query datasets (v3)
v3 queries SHALL accept Loopback-style filters (`inq`, `nin`, `like`, `ilike`, `gt`, etc.) in the `filter` query or header, map legacy fields (`proposalId`, `sampleId`, `instrumentId`, `principalInvestigator`) to array fields, and default to limit 100. `GET /fullquery` SHALL support `fields.scientific` conditions (`lhs`, `relation`, `rhs`, `unit`) and return matched metadata values converted to the requested unit.

#### Scenario: Requested unit
- **WHEN** fullquery filters `scientific` on a field stored in `mm` with `unit: "m"`
- **THEN** that field is returned in `m`

### Requirement: Public datasets (v4)
`/api/v4/datasets/public` SHALL serve list, findOne, count, fullfacet, metadataKeys, and get-by-pid without authentication, always restricted to published datasets. An unpublished or unknown pid SHALL return `{}`. Anonymous calls to non-public v4 dataset endpoints SHALL return 403.

#### Scenario: Unpublished pid on public route
- **WHEN** an anonymous client requests `/api/v4/datasets/public/<private pid>`
- **THEN** the response is 200 `{}`

### Requirement: Read single dataset
`GET /datasets/:pid` SHALL return 404 for unknown pids and 403 when the caller cannot read it. v3 SHALL return legacy singular fields.

#### Scenario: Private dataset
- **WHEN** a user outside the dataset's groups requests an unpublished dataset
- **THEN** the response is 403

### Requirement: Partial update
`PATCH /datasets/:pid` SHALL update given fields and return 412 when `If-Unmodified-Since` predates the last change. v4 SHALL apply RFC 7386 merge patch for `application/merge-patch+json`, and SHALL require both `value` and `unit` when updating a metadata entry stored with both (400 otherwise).

#### Scenario: Value without unit
- **WHEN** a v4 PATCH changes only `value` of a stored value/unit metadata entry
- **THEN** the response is 400

### Requirement: Replace
`PUT /datasets/:pid` SHALL replace the dataset, resetting omitted optional fields to defaults while keeping `pid`, `createdBy`, and `createdAt`.

#### Scenario: Omitted field
- **WHEN** a dataset is replaced without `keywords`
- **THEN** the stored dataset has no previous keywords

### Requirement: Lifecycle update
`PATCH /datasets/:pid/datasetlifecycle` SHALL merge the body into the lifecycle and return it, allowed for owners with create rights, admins, and `UPDATE_DATASET_LIFECYCLE_GROUPS`. An empty body SHALL return 400 (v4). `GET` SHALL return only the lifecycle.

#### Scenario: Lifecycle group updates
- **WHEN** a lifecycle-group member patches the lifecycle of any dataset
- **THEN** the merged lifecycle is returned

### Requirement: Delete dataset
`DELETE /datasets/:pid` SHALL require `DELETE_GROUPS`, return the deleted dataset, and SHALL NOT delete its origdatablocks, datablocks, or attachments.

#### Scenario: Delete with files
- **WHEN** a dataset with origdatablocks is deleted
- **THEN** its origdatablocks remain

### Requirement: Dataset side effects
Creating, updating, or deleting a single dataset SHALL keep metadata keys and (when enabled) the search index in sync, and create/delete SHALL adjust linked proposals' `numberOfDatasets`.

#### Scenario: Update scientific metadata
- **WHEN** a dataset's metadata key `temp` is renamed to `temperature`
- **THEN** metadata keys reflect `temperature` instead of `temp` for that dataset

### Requirement: v3-only operations
v3 SHALL provide `GET /:pid/thumbnail` (first attachment's thumbnail or `{}`), `POST /:pid/appendToArrayField` (add unique values to an array field), and nested attachment, origdatablock, and datablock routes under `/datasets/:pid`.

#### Scenario: No thumbnail
- **WHEN** a dataset without attachments is asked for its thumbnail
- **THEN** the response is `{}`
