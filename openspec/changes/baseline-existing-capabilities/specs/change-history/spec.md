# Spec Delta

## Purpose

Records an audit trail of updates and deletions of tracked entities and lets authorized users query it.

## ADDED Requirements

### Requirement: Tracked entities
History SHALL be recorded only for entity types listed in `TRACKABLES`. Single-record partial updates and deletes SHALL be recorded; creates, full replacements (PUT), and bulk operations SHALL NOT. A failure to write history SHALL NOT fail the user's operation.

#### Scenario: Untracked entity
- **WHEN** `TRACKABLES` omits `Sample` and a sample is updated
- **THEN** no history entry is written

### Requirement: Entry content
Each entry SHALL contain `subsystem`, `documentId`, `before`, `after`, `operation` (`update` or `delete`), `user`, and `timestamp`. With `TRACKABLE_STRATEGY=delta`, updates SHALL store only changed fields; otherwise full documents. Deletes SHALL store the full `before` and a null `after`.

#### Scenario: Delta update
- **WHEN** strategy is `delta` and one field of a dataset changes
- **THEN** the entry's `before` and `after` contain only that field

### Requirement: Query history
`GET /api/v3/history?filter=` SHALL return `{ items, count, totalCount, skip, limit }` sorted newest first (default limit 100). `/history/count` SHALL return `{ count }` and `/history/collection/:subsystem` SHALL list one subsystem. Invalid filter JSON SHALL return 400.

#### Scenario: Paged history
- **WHEN** an admin requests history with `limit=10`
- **THEN** at most 10 entries are returned, newest first, with `totalCount`

### Requirement: History access
History endpoints SHALL return 401 to anonymous callers. Admin groups SHALL read all subsystems; others SHALL read only subsystems granted by `HISTORY_ACCESS_<ENTITY>_GROUPS`, regardless of record ownership. Non-admins SHALL name a `subsystem`, else 400.

#### Scenario: User without history group
- **WHEN** an authenticated user with no history group queries dataset history
- **THEN** the response is 403

### Requirement: Legacy dataset history
v3 dataset list and fullquery requests whose `fields` include `history` SHALL return a `history[]` rebuilt from recorded entries, oldest first, each with `updatedAt`, `updatedBy`, and per-field `previousValue`/`currentValue`.

#### Scenario: Request legacy history
- **WHEN** a v3 client requests a dataset with `history` in fields
- **THEN** the dataset includes the reconstructed `history` array
