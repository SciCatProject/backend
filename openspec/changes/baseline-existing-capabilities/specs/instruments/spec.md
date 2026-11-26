# Spec Delta

## Purpose

Stores instruments (beamlines and similar) with a unique name and custom metadata, readable by everyone and managed by admins.

## ADDED Requirements

### Requirement: Create instrument
`POST /api/v3/instruments` SHALL require `name` and `uniqueName`, accept `pid` and `customMetadata`, and default pid to `PID_PREFIX` + UUID. A duplicate `uniqueName` or `pid` SHALL return 409. Only admin groups SHALL create.

#### Scenario: Duplicate unique name
- **WHEN** an instrument is created with an existing `uniqueName`
- **THEN** the response is 409

### Requirement: Custom metadata units
On create and update, `customMetadata` entries with a value and unit SHALL gain `valueSI` and `unitSI`, including in nested objects.

#### Scenario: Unit conversion
- **WHEN** an instrument is created with a metadata entry in `mm`
- **THEN** the entry includes its SI value in `m`

### Requirement: Query instruments
`GET /api/v3/instruments`, `/count`, and `/findOne` SHALL accept Loopback-style filters, including `like`, `ilike`, and dot paths into `customMetadata`, and SHALL be readable by everyone.

#### Scenario: Case-insensitive search
- **WHEN** a filter uses `ilike` on `name`
- **THEN** instruments matching regardless of case are returned

### Requirement: Update instrument
`PATCH /api/v3/instruments/:id` SHALL accept only `name` and `customMetadata` (other fields 400), require admin groups, return 404 if missing, and 412 on stale `If-Unmodified-Since`.

#### Scenario: Change uniqueName
- **WHEN** a PATCH includes `uniqueName`
- **THEN** the response is 400

### Requirement: Delete instrument
`DELETE /api/v3/instruments/:id` SHALL require `DELETE_GROUPS`, return the deleted instrument, and return 404 if missing.

#### Scenario: Admin deletes
- **WHEN** an admin not in `DELETE_GROUPS` deletes an instrument
- **THEN** the response is 403
