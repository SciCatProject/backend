# Spec Delta

## Purpose

Publishes collections of datasets under a DOI, moving them through a publication lifecycle and registering them with DataCite.

## ADDED Requirements

### Requirement: Identifiers
Each record SHALL get a DOI of `DOI_PREFIX` + `/` + a UUID (or a 10-character hex suffix when `DOI_SHORT_SUFFIX=true`), used as its id. v4 clients SHALL NOT supply the DOI.

#### Scenario: Short suffix
- **WHEN** `DOI_SHORT_SUFFIX` is `true` and a record is created
- **THEN** its DOI ends with a 10-character hex suffix

### Requirement: Status lifecycle
Records SHALL have status `private`, `public`, `registered`, or `amended`, starting `private`. In v4, publish SHALL require `private`, amend SHALL require `registered`, and register SHALL set `registered`; violations SHALL return 400.

#### Scenario: Publish twice
- **WHEN** `POST /api/v4/publisheddata/:id/publish` is called on a public record
- **THEN** the response is 400

### Requirement: Create published data
`POST /api/v4/publisheddata` SHALL require `title`, `abstract`, and `datasetPids`, be available to any authenticated user, and fill `metadata` defaults from the schema in `PUBLISHED_DATA_CONFIG_FILE`.

#### Scenario: Defaults applied
- **WHEN** a record is created without `metadata.publicationYear` and the schema defaults it
- **THEN** the stored record contains the default value

### Requirement: Publication config
`GET /api/v4/publisheddata/config` SHALL be public and return `{ metadataSchema, uiSchema }` from the configured file.

#### Scenario: Frontend fetches form schema
- **WHEN** an anonymous client calls the config endpoint
- **THEN** the metadata and UI schemas are returned

### Requirement: Read visibility
Anonymous callers SHALL see only registered records in lists and counts, and v4 single reads SHALL also show public and amended records. Authenticated non-admins SHALL additionally see their own private records. Admins SHALL see all.

#### Scenario: Anonymous reads private record
- **WHEN** an anonymous client requests a private record
- **THEN** the response is 404

### Requirement: Edit restrictions
Non-admins SHALL edit or resync only their own private records. Admins SHALL NOT edit registered or amended records. Violations SHALL return 400, or 404 for another user's private record.

#### Scenario: Admin edits registered record
- **WHEN** an admin patches a registered record
- **THEN** the response is 400

### Requirement: Publish datasets
Publishing (v4) and registering SHALL validate `metadata` against the schema, returning 400 with errors on failure, and SHALL set `isPublished: true` on every dataset in `datasetPids`.

#### Scenario: Publish record
- **WHEN** a valid private record is published
- **THEN** its status is `public` and all its datasets are published

### Requirement: DOI registration
v4 register SHALL, when `REGISTER_DOI_URI` is set, publish the DOI to DataCite with `DOI_USERNAME`/`DOI_PASSWORD`, pointing to `metadata.landingPage` or `PUBLIC_URL_PREFIX` plus the DOI. A DataCite failure SHALL return 424. On success the status SHALL be `registered` and `registeredTime` set.

#### Scenario: DataCite rejects
- **WHEN** DataCite returns an error during registration
- **THEN** the response is 424 and the record is not marked registered

### Requirement: Delete published data
Deletion SHALL require `DELETE_GROUPS`. In v4, admins SHALL NOT delete registered or amended records and other delete-group members SHALL delete only private records.

#### Scenario: Delete public record
- **WHEN** a non-admin delete-group member deletes a public record via v4
- **THEN** the response is 400

### Requirement: Form prefill
`GET /api/v4/publisheddata/formpopulate?pid=` SHALL require read access to the first dataset and return its resource type, description, thumbnail, and its first proposal's title and abstract.

#### Scenario: Prefill from dataset
- **WHEN** a user requests formpopulate for a readable dataset linked to a proposal
- **THEN** the proposal title and abstract are returned

### Requirement: v3 compatibility
`/api/v3/publisheddata` SHALL accept and return the legacy shape (`pidArray`, `creator`, `publisher`, `publicationYear`, etc.) mapped to the v4 record, including in filters. v3 output status SHALL be `registered` for registered or amended records and `pending_registration` otherwise.

#### Scenario: v3 read of public record
- **WHEN** a v3 client reads a record with status `public`
- **THEN** its status is shown as `pending_registration`
