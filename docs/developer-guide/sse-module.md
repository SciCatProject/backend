# Server-Sent Events (SSE)

The backend can push document changes to connected clients over a
`text/event-stream` connection, so a frontend can react to new datasets without
polling.

## How it works

```
MongoDB change stream
        │
   SseListener      watches the oplog, maps a raw document to a DTO
        │
   SseService       holds one RxJS Subject per open connection,
        │           filters each event per user
   SseController    exposes the stream over HTTP
        │
     client
```

Events originate in MongoDB rather than in application code. That is deliberate:
a change stream sees every write regardless of which code path produced it, so a
dataset created through a background job or a migration is broadcast the same way
as one created through the API. The alternative, emitting from service methods,
would silently miss any write that bypassed them.

## Requirements

SSE depends on MongoDB change streams, which only exist on a replica set. On
startup `SseListener` probes the connection and, if it finds a standalone
`mongod`, logs a message and leaves SSE disabled. The rest of the API is
unaffected.

While disabled, the SSE endpoints return `503 Service Unavailable` rather than
failing silently, so a misconfigured deployment is visible instead of merely
quiet.

To convert a standalone container to a single-node replica set:

```yaml
services:
  mongodb:
    image: mongo:latest
    command: ["--replSet", "rs0", "--bind_ip_all"]
```

then initiate it once:

```bash
mongosh --eval 'rs.initiate({_id:"rs0",members:[{_id:0,host:"localhost:27017"}]})'
```

Existing data in the volume is preserved.

## Authentication

`EventSource`, the browser API for consuming SSE, cannot set request headers, so
a bearer token cannot be sent the usual way. The stream therefore uses a
short-lived ticket passed as a query parameter.

```
POST /api/v3/events/ticket     Authorization: Bearer <session token>
  → { "ticket": "<jwt>" }

GET  /api/v3/events/stream?ticket=<jwt>
```

The ticket is a JWT signed with the same secret as a session token, but carrying
`purpose: "sse"`. `JwtStrategy` enforces that claim in both directions: a ticket
is rejected on any route other than the stream, and the stream rejects anything
that is not a ticket. Scoping matters here because a credential in a URL ends up
in access logs, proxy logs, and browser history, so it must be useless anywhere
else.

Tickets are single-purpose but not single-use. Within their lifetime the same
ticket can open more than one connection, which is why the default lifetime is
short.

Because tickets expire quickly, a dropped stream cannot simply be reopened at the
same URL. Clients must mint a new ticket for each reconnect. The browser's
built-in `EventSource` reconnect replays the original URL and will fail, so
clients should call `close()` on error and restart the flow from the ticket
request.

## Authorization

Two independent checks apply.

**At connection time**, CASL decides who may open a stream at all. Any
authenticated user has `sse_read`; members of `ADMIN_GROUPS` additionally get
`access_any`, which gates the connections endpoint.

**Per event**, `SseService` filters every message against every connected user
before sending it. A user receives a document only if one of these holds:

- the document's `ownerGroup` is one of the user's groups
- the document's `accessGroups` intersect the user's groups
- the user belongs to an admin group

Filtering happens on emit rather than on subscribe because a user's visibility is
a property of each document, not of the connection. Two users on the same stream
see different subsets of the same event flow.

## Endpoints

| Method | Path                         | Auth                | Description                                |
| ------ | ---------------------------- | ------------------- | ------------------------------------------ |
| `POST` | `/api/v3/events/ticket`      | Bearer token        | Mints a short-lived stream ticket.         |
| `GET`  | `/api/v3/events/stream`      | Ticket, query param | Opens the event stream.                    |
| `GET`  | `/api/v3/events/connections` | Bearer token, admin | Reports open connections on this instance. |

### Event format

```json
{
  "type": "Dataset.created",
  "data": { "pid": "20.500.12269/...", "datasetName": "..." }
}
```

`type` is `<entity>.<action>`. The payload is the document serialized through its
output DTO, not the raw MongoDB document, so clients see the same shape the REST
API returns.

## What is watched

A registry in `sse.listener.ts` maps collections to entities and DTOs. Today it
holds one entry:

| Collection | Entity    | Actions   |
| ---------- | --------- | --------- |
| `Dataset`  | `Dataset` | `created` |

Only `insert` operations are mapped. The `SseAction` type reserves `updated` and
`deleted` for later, but no change stream operation maps to them yet, so those
events are never emitted.

Adding a collection means adding a registry entry with its DTO. The change stream
pipeline is built from the registry keys, so no other change is needed.

## Configuration

| Variable                | Type   | Default | Description                 |
| ----------------------- | ------ | ------- | --------------------------- |
| `SSE_TICKET_EXPIRES_IN` | number | `60`    | Ticket lifetime in seconds. |

## Limits and operational behaviour

**Connections per user.** Five per user per instance. A sixth request returns
`403 Forbidden`. The cap is per instance, so behind a load balancer the effective
total is five times the number of replicas.

**Reconnect on change stream failure.** If the change stream errors, the listener
retries up to five times with exponential backoff starting at two seconds. After
that it stops and logs an error, and SSE stays down until the process restarts.
Worth alerting on, since nothing recovers automatically past that point.

**Multi-instance deployments.** Connections are held in an in-memory `Map`, so
each instance knows only its own clients. Every instance runs its own change
stream and broadcasts to its own connections, so clients receive events wherever
they land. The consequence is that `/events/connections` reports one instance's
view rather than a cluster-wide total.

**Shutdown.** On module destroy the change stream is closed and every client
Subject is completed, so connections end cleanly rather than being dropped.
