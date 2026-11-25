# Spec Delta

## Purpose

Streams dataset creation events to authenticated clients over server-sent events (SSE), filtered by each user's group access.

## ADDED Requirements

### Requirement: Stream ticket issuance
`POST /api/v3/events/ticket` SHALL return `{ ticket }` to any authenticated user: a signed token carrying the user's claims, valid only for the event stream, expiring after `SSE_TICKET_EXPIRES_IN` seconds (default 60). Anonymous callers SHALL be refused. Tickets are not single-use.

#### Scenario: Authenticated user requests a ticket
- **WHEN** an authenticated user calls `POST /api/v3/events/ticket`
- **THEN** the response contains a `ticket` usable on `GET /api/v3/events/stream`

#### Scenario: Anonymous user requests a ticket
- **WHEN** an unauthenticated client calls `POST /api/v3/events/ticket`
- **THEN** the request is rejected with 403

### Requirement: Stream authentication by ticket
`GET /api/v3/events/stream` SHALL authenticate only via a `ticket` query parameter. A regular access token SHALL NOT be accepted on the stream, and a ticket SHALL NOT be accepted as an access token elsewhere.

#### Scenario: Expired ticket
- **WHEN** a client opens the stream with an expired ticket
- **THEN** the request is rejected with 401

### Requirement: Dataset creation events
The system SHALL emit an event for every document inserted into the dataset collection, including inserts made outside the API. Each event's data SHALL be `{ "type": "Dataset.created", "data": <dataset> }` with the dataset in API output form. Updates and deletions SHALL NOT emit events.

#### Scenario: Dataset created
- **WHEN** a dataset is inserted
- **THEN** each authorized open stream receives a `Dataset.created` message with that dataset

#### Scenario: Dataset updated
- **WHEN** an existing dataset is updated or deleted
- **THEN** no event is sent

### Requirement: Per-user event filtering
An event SHALL be delivered to a stream only if the user belongs to an admin group, or the user's groups include the dataset's `ownerGroup` or any of its `accessGroups`. Publication status SHALL NOT grant delivery. Groups SHALL be fixed when the stream connects.

#### Scenario: User outside dataset groups
- **WHEN** a published dataset is created whose ownerGroup and accessGroups do not include the user's groups
- **THEN** the user's stream does not receive the event

### Requirement: Heartbeat
Every open stream SHALL receive a named `heartbeat` event with empty data every 20 seconds.

#### Scenario: Idle stream
- **WHEN** a stream is open with no dataset activity for 20 seconds
- **THEN** it receives a `heartbeat` event

### Requirement: Per-user connection limit
Each user SHALL have at most 5 open streams per backend instance. Opening another SHALL close that user's oldest stream after sending it an `evicted` event with data `max-connections`. Other users' streams SHALL NOT be affected.

#### Scenario: Sixth connection
- **WHEN** a user with 5 open streams opens a sixth
- **THEN** the oldest stream receives `evicted` and closes, and the new stream stays open

### Requirement: Connection statistics
`GET /api/v3/events/connections` SHALL return `{ connections, users: { <username>: <count> } }` for the current instance, and SHALL be restricted to admin groups.

#### Scenario: Non-admin requests statistics
- **WHEN** a non-admin user calls `GET /api/v3/events/connections`
- **THEN** the request is rejected with 403

### Requirement: Replica set prerequisite
When MongoDB is not a replica set, the stream and connections endpoints SHALL respond 503 "SSE is not enabled.".

#### Scenario: Standalone MongoDB
- **WHEN** the backend runs against a standalone MongoDB and a client opens the stream
- **THEN** the response is 503

### Requirement: Change stream recovery
If the database change stream fails, the system SHALL retry up to 5 times with exponential backoff starting at 2 seconds. After that, open streams SHALL stay connected and keep receiving heartbeats but no dataset events.

#### Scenario: Change stream error
- **WHEN** the change stream errors once
- **THEN** event delivery resumes after it reconnects
