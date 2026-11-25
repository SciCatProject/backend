# Spec Delta

## Purpose

Gives authenticated users read access to an external logbook (SciChat) service, limited to logbooks of proposals their groups own.

## ADDED Requirements

### Requirement: Feature flag and upstream
Logbook access SHALL be active only when `LOGBOOK_ENABLED` is `yes`, proxying to `LOGBOOK_BASE_URL` (default `http://localhost:3030/scichatapi`). When disabled, listing SHALL return `[]` and single fetches SHALL return `null`.

#### Scenario: Disabled listing
- **WHEN** logbooks are disabled and a user calls `GET /api/v3/logbooks`
- **THEN** the response is an empty array

### Requirement: Authenticated access only
The logbook endpoints SHALL be available only to authenticated users.

#### Scenario: Anonymous request
- **WHEN** an unauthenticated client calls `GET /api/v3/logbooks`
- **THEN** the request is rejected with 403

### Requirement: List logbooks
`GET /api/v3/logbooks` SHALL return the upstream logbooks, ordered by most recent message first, with logbooks that have no messages last. An upstream failure SHALL return 500.

#### Scenario: Upstream down
- **WHEN** the logbook service is unreachable during a listing
- **THEN** the response is 500 "Fetching Logbooks failed"

### Requirement: Fetch one logbook
`GET /api/v3/logbooks/:name` SHALL accept a JSON `filters` parameter with `skip`, `limit`, and `sortField` (`timestamp|sender|entry` with `:asc` or `:desc`), and apply sorting and paging to the messages. Upstream errors or invalid filters SHALL yield `null`, not an error.

#### Scenario: Sorted, paged messages
- **WHEN** a user requests a logbook with `{"skip":0,"limit":10,"sortField":"timestamp:desc"}`
- **THEN** at most 10 messages are returned, newest first

### Requirement: Proposal ownership filter
Responses SHALL include only logbooks whose name equals the `proposalId` of a proposal owned by one of the user's groups; others SHALL be removed from lists or returned as `null`. Users holding the `admin` role SHALL see all logbooks.

#### Scenario: Logbook of another group's proposal
- **WHEN** a user fetches a logbook named after a proposal their groups do not own
- **THEN** the response is `null`

### Requirement: Dataset logbook
`GET /datasets/:pid/logbook` SHALL return the logbook of the dataset's first proposal, or `null` if the dataset has no proposal. It SHALL require logbook-read permission on that dataset.

#### Scenario: Dataset without proposal
- **WHEN** a permitted user requests the logbook of a dataset with no `proposalIds`
- **THEN** the response is `null`
