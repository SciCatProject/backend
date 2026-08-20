# PublishedData Authorization Model

This document describes the authorization model used for published data and associated endpoints, for both the v4 endpoints (`/api/v4/publisheddata`) and the deprecated v3 endpoints (`/api/v3/publisheddata`).

> **Note:** The ownership model described here is a temporary deviation from the SciCat authorization pattern. See [Temporary ownership model](#temporary-ownership-model) below.

## Actions

The following actions are defined for published data:

- `Create`
- `Read`
- `Update`
- `Delete`
- `AccessAny`

`Create`, `Read`, `Update` and `Delete` are used for endpoint authorization, i.e. whether a user may call an endpoint at all. `AccessAny` is used for instance authorization, i.e. whether a user may act on records they do not own.

## Record states

Every published data record carries a `status` field, which takes one of the following values, and which participates in authorization:

- `private`: a draft, visible only to its creator (and admins)
- `public`: made public, but not yet registered with a DOI registrar
- `registered`: registered with a DOI registrar
- `amended`: registered and subsequently amended

Records in state `public`, `registered` or `amended` are readable by everyone. Only records in state `private` may be modified or deleted by their creator.

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read published data records that are in state `public`, `registered` or `amended`. Listing and counting endpoints are filtered accordingly, and a request for a `private` record is answered with `404 Not Found`.

Unauthenticated users have no write access.

### Authenticated

In addition to the permissions granted to unauthenticated users, an authenticated user may read the `private` records for which their username matches the record's `createdBy`.

An authenticated user may create published data records. They may update, register, resync and delete only records for which their username matches `createdBy` **and** whose status is `private`. Attempting to modify a record owned by another user is answered with `404 Not Found`; attempting to modify an own record that is no longer `private` is answered with `400 Bad Request`.

### DELETE_GROUPS

If a user is a member of a group listed in configuration as part of `DELETE_GROUPS`, they are permitted to call the delete endpoint.

On the v4 endpoint, the instance-level restrictions above still apply, i.e. a non-admin may delete only their own `private` records. The deprecated v3 delete endpoint performs no instance-level check at all: any member of `DELETE_GROUPS` may delete any record in any state.

### ADMIN_GROUPS

If a user is a member of a group listed in configuration as part of `ADMIN_GROUPS`, they are granted `AccessAny` and therefore have unrestricted read access to all published data records, regardless of status or creator, and may update, register, resync and delete records created by any user.

Admins are still subject to the lifecycle guard: records in state `registered` or `amended` cannot be updated or deleted, since they have already been handed over to a DOI registrar.

## Permission Matrix

| Operation | Unauthenticated | Authenticated | `DELETE_GROUPS` | `ADMIN_GROUPS` |
| - | - | - | - | - |
| `Create` | - | any | - | any |
| `Read` | published | published + own | published + own | any |
| `Update` | - | own private | own private | any not registered/amended |
| `Delete` | - | - | own private (v4) / any (v3) | any not registered/amended |

Legend:
- published: record `status` must be `public`, `registered` or `amended`
- own: record `createdBy` must match the user's username
- own private: record `createdBy` must match the user's username and `status` must be `private`
- any: unrestricted access

## Implementation Notes

Endpoint authorization is defined in `CaslAbilityFactory.publishedDataEndpointAccess` and applied through the `PoliciesGuard` and `@CheckPolicies` decorators on the controllers.

Instance authorization is defined in `CaslAbilityFactory.publishedDataInstanceAccess`, which grants `AccessAny` to members of `ADMIN_GROUPS` only. Both controllers use this single ability to decide whether to narrow the Mongo query:

- Read endpoints (`GET /`, `GET /count`, `GET /:id`) add an `$or` filter that matches published records plus the caller's own `private` records. The filter is combined with the client supplied `where` rather than replacing it.
- Mutating endpoints (`PATCH /:id`, `POST /:id/register`, `POST /:id/resync`, and `DELETE /:id` on v4) build a filter on `doi` plus `createdBy` for non-admins, so a record belonging to somebody else is simply not found, and the same filter is reused for the write itself.
- The lifecycle guard on `status` is applied after the record has been fetched, and is what distinguishes a `400 Bad Request` (found, but not modifiable in its current state) from a `404 Not Found` (not visible to the caller).

Since a record's only ownership information is `createdBy`, there is no group-based rule to express here, and no `ownerGroup`/`accessGroups` conditions appear in the ability.

## Temporary ownership model

Unlike datasets, samples, proposals and most other SciCat entities, the `PublishedData` schema does not extend `OwnableClass`: it has no `ownerGroup` and no `accessGroups` fields. The only ownership hint available is `createdBy`.

The `createdBy`-based rules described above were introduced as a hot fix for a security issue: on the v3 endpoints, any authenticated user could read any other user's `private` published data and could `PATCH` it, since those endpoints performed authentication but no further authorization (see [PR #2886](https://github.com/SciCatProject/backend/pull/2886)).

This is understood to be a temporary measure and knowingly deviates from the supported, group-based SciCat pattern. In particular:

- Only the exact creator of a record can act on it, whereas elsewhere in SciCat any member of the record's `ownerGroup` could.
- The "four eyes" workflow, in which a colleague reviews a `private` published data record before it is registered, is not possible through these endpoints.

The intended long-term solution is to make `PublishedData` extend `OwnableClass` and to migrate existing records so that `ownerGroup` and `accessGroups` are populated, after which the rules above should be replaced by the standard group-based checks. This is tracked in [issue #2900](https://github.com/SciCatProject/backend/issues/2900). The current model will be supported until that redesign is implemented.
