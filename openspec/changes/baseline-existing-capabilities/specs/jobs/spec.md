# Spec Delta

## Purpose

Runs configurable jobs (such as archive or retrieve requests) whose types, authorization, and actions are defined in a job configuration file.

## ADDED Requirements

### Requirement: Job configuration
Job types SHALL be loaded from `JOB_CONFIGURATION_FILE` (YAML or JSON) with `configVersion` and `jobs[]`, each with `jobType` and `create`/`update` sections holding `auth` and `actions`. Invalid config, duplicate job types, or unknown action types SHALL abort startup. Creating a job of an unconfigured type SHALL return 400.

#### Scenario: Unknown job type
- **WHEN** a job is created with a type not in the configuration
- **THEN** the response is 400 "Invalid job type"

### Requirement: Create job
`POST /api/v4/jobs` SHALL accept `{ type, jobParams, ownerUser?, ownerGroup?, contactEmail? }`, generate a UUID `id`, and set initial status from `jobParams.jobStatusMessage` or `JOB_DEFAULT_STATUS_CODE`/`JOB_DEFAULT_STATUS_MESSAGE` (defaults `jobSubmitted`/`Job submitted.`).

#### Scenario: Default status
- **WHEN** a job is created without a status message
- **THEN** its `statusCode` is `jobSubmitted`

### Requirement: Dataset list validation
When `jobParams.datasetList` is given, it SHALL be a non-empty list of `{ pid, files }`. Every dataset and every listed file SHALL exist; `files: []` SHALL mean all files. Violations SHALL return 422.

#### Scenario: Missing file
- **WHEN** a job lists a file not present in the dataset's origdatablocks
- **THEN** the response is 422

### Requirement: Job ownership
Non-privileged callers SHALL specify an `ownerGroup` they belong to and SHALL own the job themselves, else 403. Admin and `CREATE_JOB_PRIVILEGED_GROUPS` callers MAY set any owner but SHALL provide at least one of owner group, owner user, or contact email, else 422.

#### Scenario: Group not joined
- **WHEN** a regular user creates a job with an `ownerGroup` they are not in
- **THEN** the response is 403

### Requirement: Create authorization
Job creation SHALL be authorized by the type's `create.auth`: `#all`, `#datasetPublic`, `#authenticated`, `#datasetAccess`, `#datasetOwner`, `#datasetAccessAndProposalPI`, `#jobAdmin`, `@<group>`, or a username. Dataset-based rules SHALL apply to every listed dataset. Admin groups SHALL bypass dataset checks.

#### Scenario: Not principal investigator
- **WHEN** a user creates a `#datasetAccessAndProposalPI` job for a dataset whose proposal `pi_email` differs from theirs
- **THEN** the response is 403

### Requirement: Update job
`PATCH /api/v4/jobs/:id` SHALL require `statusCode` and `statusMessage` and accept `jobResultObject`, authorized by `update.auth` (`#all`, `#jobOwnerUser`, `#jobOwnerGroup`, `#jobAdmin`, `@<group>`, username). `application/merge-patch+json` SHALL apply a merge patch. An unknown id SHALL return 400.

#### Scenario: Owner updates status
- **WHEN** the job's owner user updates a `#jobOwnerUser` job
- **THEN** the status is changed and `updatedBy` is set

### Requirement: Privileged job groups
`CREATE_JOB_PRIVILEGED_GROUPS` SHALL create and read any job, and `UPDATE_JOB_PRIVILEGED_GROUPS` SHALL read and update any job. A member of only one of these groups SHALL lose the other right. Deleting SHALL require `DELETE_JOB_GROUPS`.

#### Scenario: Create-only privileged user updates
- **WHEN** a user only in `CREATE_JOB_PRIVILEGED_GROUPS` updates a job
- **THEN** the response is 403

### Requirement: Read jobs
Authenticated users SHALL read only jobs they own or whose owner group they belong to; anonymous list and query requests SHALL return 403. Lists SHALL sort by `createdAt` ascending by default. v4 `include` SHALL accept only `datasets`.

#### Scenario: Another group's job
- **WHEN** a user requests a job owned by a group they are not in
- **THEN** the response is 403

### Requirement: Job actions
On create and update, the system SHALL validate all configured actions before saving, then perform them in configured order after saving. Action types SHALL be `log`, `error`, `validate`, `email`, `url`, `rabbitmq` (requires `RABBITMQ_ENABLED=yes`), and `switch`. Action templates SHALL see the request, job, datasets, and environment.

#### Scenario: Validate action fails
- **WHEN** a request violates a `validate` action's schema
- **THEN** the response is 400 and the job is not stored

#### Scenario: URL action fails after save
- **WHEN** a `url` action without `ignoreErrors` gets a non-2xx response
- **THEN** an error is returned although the job was already saved

### Requirement: v3 compatibility
`/api/v3/jobs` SHALL accept the legacy body (`type`, top-level `datasetList`, `emailJobInitiator`, `jobStatusMessage`, `executionTime`) and return legacy field names (`emailJobInitiator`, `creationTime`, `jobStatusMessage`, `datasetList`).

#### Scenario: v3 create
- **WHEN** a v3 client creates a job with top-level `datasetList`
- **THEN** the job's datasets come from that list
