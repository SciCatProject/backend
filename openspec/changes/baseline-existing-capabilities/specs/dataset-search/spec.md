# Spec Delta

## Purpose

Optional OpenSearch integration that indexes datasets and accelerates dataset text search, with admin endpoints to manage the index.

## ADDED Requirements

### Requirement: Feature flag
The search integration SHALL be active only when `OPENSEARCH_ENABLED` is `yes`. When inactive, the `/api/v3/opensearch/*` endpoints SHALL NOT exist and datasets SHALL NOT be indexed.

#### Scenario: Disabled
- **WHEN** `OPENSEARCH_ENABLED` is unset and a dataset is created
- **THEN** nothing is indexed and dataset search uses MongoDB only

### Requirement: Default index on startup
When enabled, the system SHALL connect to `OPENSEARCH_HOST` with retries and create the default index (`OPENSEARCH_DEFAULT_INDEX`, default `dataset`) if it is missing, using settings and mappings from `OPENSEARCH_CONFIG_FILE`. If it cannot connect, the backend SHALL run without search.

#### Scenario: Index missing at startup
- **WHEN** the backend starts and the default index does not exist
- **THEN** the index is created from the configured settings and mappings

### Requirement: Index management endpoints
The system SHALL expose create-index, delete-index, get-index, update-index (settings), and sync-database endpoints under `/api/v3/opensearch`, restricted to admin groups. Management failures SHALL return 400.

#### Scenario: Non-admin manages index
- **WHEN** a non-admin user calls any `/api/v3/opensearch` endpoint
- **THEN** the request is rejected with 403

#### Scenario: Full resync
- **WHEN** an admin calls `POST /api/v3/opensearch/sync-database?index=<existing index>`
- **THEN** all datasets are bulk-indexed into that index and bulk statistics are returned

### Requirement: Automatic dataset sync
When enabled, creating, replacing, or patching a single dataset SHALL upsert it in the default index, and deleting a dataset SHALL remove it. Only a fixed subset of fields (access fields `isPublished`, `ownerGroup`, `accessGroups`, plus searchable fields including scientific metadata) SHALL be indexed.

#### Scenario: Dataset deleted
- **WHEN** a dataset is deleted
- **THEN** it is removed from the default index

### Requirement: Search routing
`GET /datasets/fullquery` and `GET /datasets/fullfacet` SHALL use the index for the `text` filter only when search is enabled, connected, `fields.text` is provided, and the default index is non-empty. Otherwise they SHALL fall back to MongoDB.

#### Scenario: Empty index
- **WHEN** a text query is made while the default index has no documents
- **THEN** the query is answered from MongoDB

### Requirement: Text matching
Index-backed text search SHALL first match all terms, then fall back to a case-insensitive substring match if nothing is found. The remaining filters, paging, and sorting SHALL then be applied to the matching datasets.

#### Scenario: Partial word
- **WHEN** the text is a fragment of a word in a dataset's indexed fields
- **THEN** that dataset is returned

### Requirement: Search access rules
Index-backed search SHALL apply the same visibility rules as dataset queries: anonymous users see only published datasets, and non-admin users see only datasets whose ownerGroup or accessGroups match their groups unless the query requests `isPublished`.

#### Scenario: Anonymous text search
- **WHEN** an anonymous user runs a text search
- **THEN** only published datasets are returned
