# SSE Authorization Model

This document describes the authorization model used for the server-sent event stream and associated endpoints.

## Actions

The following actions are defined for server-sent events:

- `SseRead`
- `AccessAny`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user has no access to any server-sent event endpoint.

### Authenticated

An authenticated user may request a stream ticket and open an event stream. They receive only those documents they are permitted to see, evaluated per event: documents whose `ownerGroup` is one of their groups, or whose `accessGroups` intersect their groups.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they receive every document emitted on the stream regardless of its groups, and they may read the list of active connections on the instance.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation   | Unauthenticated | Authenticated | `ADMIN_GROUPS` |
| ----------- | --------------- | ------------- | -------------- |
| `SseRead`   | -               | own           | any            |
| `AccessAny` | -               | -             | any            |

Legend:

- any: unrestricted access
- own: access limited to documents owned by or shared with one of the user's groups

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/sse.ability.ts` and accessible elsewhere via `CaslAbilityFactory.sseAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

Unlike other subjects, the casl ability alone does not express the full model. `SseRead` is granted unconditionally to every authenticated user, so endpoint authorization admits anyone logged in. The document-level restriction shown as `own` above is enforced separately in `SseService.emit`, which tests each outgoing document against each connected user before delivering it. Group membership is evaluated against the user captured when the connection opened, so changes take effect on the next connection rather than immediately.

`SseClass` is an empty marker class rather than a schema. Server-sent events have no persisted document, so it exists only to give casl a subject to attach grants to.

## Authentication Notes

The stream endpoint authenticates differently from the rest of the API. `EventSource` cannot set request headers, so `GET /events/stream` accepts a ticket as a query parameter instead of a bearer token. The ticket is a JWT carrying `purpose: "sse"`, minted by `POST /events/ticket`, which is itself guarded by `SseRead`. Authorization is therefore evaluated twice against the same rules, once when the ticket is issued and again when the stream is opened.

`JwtStrategy.validate` rejects a ticket presented on any other route, and rejects a normal bearer token on the stream route. The first direction is a security property: a credential in a URL reaches access logs and browser history, so it must be useless elsewhere. The second is a consistency choice that makes the ticket the only way to open a stream.
