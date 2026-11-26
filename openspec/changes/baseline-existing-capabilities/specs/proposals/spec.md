# Spec Delta

## Purpose

Stores experiment proposals, including principal investigator, measurement periods, and type, and links them to datasets and attachments.

## ADDED Requirements

### Requirement: Create proposal
`POST /api/v3/proposals` SHALL require `proposalId`, `ownerGroup`, `email`, and `title`, use `proposalId` as the record id, and reject unknown fields with 400. A duplicate `proposalId` SHALL return 409. Only `PROPOSAL_GROUPS` and admin groups SHALL create.

#### Scenario: Duplicate proposal
- **WHEN** a proposal is created with an existing `proposalId`
- **THEN** the response is 409

### Requirement: Proposal type
`type` SHALL default to `Default Proposal`. On create, it SHALL be one of the values in `PROPOSAL_TYPES_FILE` or `Default Proposal`, else 400.

#### Scenario: Unknown type
- **WHEN** a proposal is created with a type not in the configured list
- **THEN** the response is 400 listing the allowed values

### Requirement: Measurement periods
Proposals SHALL embed `MeasurementPeriodList` entries with a required `instrument` and `start`/`end` times. Times without a timezone SHALL be stored as UTC.

#### Scenario: Local time period
- **WHEN** a period's `start` has no timezone offset
- **THEN** it is stored as UTC

### Requirement: Validate without saving
`POST /api/v3/proposals/isValid` SHALL return 200 `{ valid: boolean }` without storing anything.

#### Scenario: Unknown field
- **WHEN** a body with an unknown field is validated
- **THEN** the response is `{ valid: false }`

### Requirement: Query proposals
`GET /api/v3/proposals` (`filters` with where, fields, limits, include), `/fullquery`, `/fullfacet`, and `/count` SHALL apply access filtering. The default limit SHALL be 100. `include` SHALL accept only `samples` or `all`; other relations SHALL return 400. `fields.text` SHALL perform full-text search.

#### Scenario: Include unknown relation
- **WHEN** a list request includes relation `instruments`
- **THEN** the response is 400

### Requirement: Access check
`GET /api/v3/proposals/:pid/authorization` SHALL return `{ canAccess: boolean }`, false for missing proposals. `GET /:pid` SHALL return 404 for unknown and 403 for inaccessible proposals.

#### Scenario: Missing proposal check
- **WHEN** authorization is checked for a nonexistent proposal
- **THEN** the response is `{ canAccess: false }`

### Requirement: Update and delete
`PATCH /api/v3/proposals/:pid` SHALL partially update, keeping omitted fields, and SHALL return 412 if `If-Unmodified-Since` is older than the last change. `DELETE` SHALL return the deleted proposal and require `DELETE_GROUPS`. Unknown ids SHALL return 404.

#### Scenario: Stale update
- **WHEN** a PATCH carries `If-Unmodified-Since` earlier than the proposal's `updatedAt`
- **THEN** the response is 412

### Requirement: Proposal attachments and datasets
The system SHALL manage attachments under `/api/v3/proposals/:pid/attachments`, taking `proposalId` from the path. `GET /:pid/datasets` SHALL return the proposal's datasets filtered by the caller's dataset access, and SHALL be limited to `PROPOSAL_GROUPS` and admins.

#### Scenario: Regular user lists proposal datasets
- **WHEN** a user outside `PROPOSAL_GROUPS` and admin groups calls `GET /:pid/datasets`
- **THEN** the response is 403

### Requirement: Dataset count
A proposal's `numberOfDatasets` SHALL increase when a dataset referencing it in `proposalIds` is created and decrease when that dataset is deleted.

#### Scenario: Dataset linked
- **WHEN** a dataset with `proposalIds: [P]` is created
- **THEN** proposal P's `numberOfDatasets` increases by one
