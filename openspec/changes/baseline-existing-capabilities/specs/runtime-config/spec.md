# Spec Delta

## Purpose

Stores configuration documents (such as the frontend config and theme) in the database so they can be read publicly and edited by admins at runtime.

## ADDED Requirements

### Requirement: Startup seeding
On startup the system SHALL sync each config id in the sync list (`frontendConfig`, `frontendTheme`, plus ids in `CONFIG_SYNC_TO_DB_LIST`) from the backend configuration. It SHALL create missing entries, and SHALL overwrite existing entries only when `CONFIG_SYNC_TO_DB_RELOAD` is true (the default). Empty config values SHALL be skipped.

#### Scenario: Existing entry with reload disabled
- **WHEN** an entry exists and `CONFIG_SYNC_TO_DB_RELOAD` is `false`
- **THEN** the stored value is kept on restart

#### Scenario: Existing entry with default reload
- **WHEN** an admin edited an entry and the backend restarts with default settings
- **THEN** the entry's data is replaced by the configured value and `updatedBy` is `system`

### Requirement: Public read
`GET /api/v3/runtime-config/:id` SHALL be available without authentication and SHALL return `{ cid, data, createdBy, updatedBy, createdAt, updatedAt }`. An unknown id SHALL return 404.

#### Scenario: Anonymous read
- **WHEN** an unauthenticated client requests `GET /api/v3/runtime-config/frontendConfig`
- **THEN** the stored config is returned

### Requirement: Admin update
`PUT /api/v3/runtime-config/:id` SHALL be restricted to admin groups. It SHALL require a body `{ data: <object> }`, reject unknown properties with 400, replace `data` entirely, and set `updatedBy` to the caller. There SHALL be no create or delete endpoint.

#### Scenario: Non-admin update
- **WHEN** a non-admin user calls `PUT /api/v3/runtime-config/frontendConfig`
- **THEN** the request is rejected with 403

### Requirement: Frontend config and theme shortcuts
`GET /api/v3/admin/config` and `GET /api/v3/admin/theme` SHALL be public and return only the `data` of `frontendConfig` and `frontendTheme` respectively.

#### Scenario: Frontend loads theme
- **WHEN** an unauthenticated client calls `GET /api/v3/admin/theme`
- **THEN** the theme data object is returned

### Requirement: Change history
Changes to runtime config entries SHALL be recorded in the change history only when `RuntimeConfig` is listed in `TRACKABLES`.

#### Scenario: Tracking enabled
- **WHEN** `RuntimeConfig` is in `TRACKABLES` and an admin updates an entry
- **THEN** a history record of the change is stored
