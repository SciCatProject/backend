# Published Data Authorization Model

This document describes the authorization model used for published data and associated endpoints, for both the v4 endpoints (`/api/v4/publisheddata`) and the deprecated v3 endpoints (`/api/v3/publisheddata`).

> **Note:** The ownership model described here is a temporary deviation from the SciCat authorization pattern. See [Temporary ownership model](#temporary-ownership-model) below.

## Actions

The following actions are defined for published data:

- `AccessAny`
- `Create`
- `Read`
- `Update`
- `Delete`

## Record states

Every published data record carries a `status` field, which takes one of the following values, and which participates in authorization:

- `private`: a draft, visible only to its creator and admins
- `public`: made public, but not yet registered with a DOI registrar
- `registered`: registered with a DOI registrar
- `amended`: registered and subsequently amended

Records in state `public`, `registered` or `amended` are readable by everyone. Only records in state `private` may be modified or deleted by their creator.

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

Unauthenticated users do not have casl permissions to interact with published data records. However, all read endpoints are unguarded with the `@AllowAny` decorator, effectively giving unauthenticated users conditional read access.
Read access is limited to published data records with status `PUBLIC`, `REGISTERED` or `AMENDED` for unauthenticated users.

### Authenticated

An authenticated user has unrestricted create, and conditional read and update casl permissions for any published data record.
Read access is limited to published data records with status `PUBLIC`, `REGISTERED` or `AMENDED` and records with status `PRIVATE` if the user is listed under the record's `createdBy` field.
Update access is limited to `PRIVATE` records with the user listed under the record's `createdBy` field.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create and read casl permissions, and conditional and update permissions. They are only allowed to update records with `PRIVATE` or `PUBLIC` status, regardless of ownership. Records in `REGISTERED` or `AMENDED` status cannot be updated by anyone.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all published data records in the database. For the API v4 endpoint, records in `REGISTERED` or `AMENDED` status cannot be deleted by anyone.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

### API v3

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - |
| `Create` | - | any | any | any |
| `Read` | public | public/owner | any | public/owner |
| `Update` | - | owner | unregistered | owner |
| `Delete` | - | - | - | any |

### API v4

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - |
| `Create` | - | any | any | any |
| `Read` | public | public/owner | any | public/owner |
| `Update` | - | owner | unregistered | owner |
| `Delete` | - | - | - | unregistered |

Legend:
- owner: publishedData's `status` field must be `PRIVATE` and the `createdBy` field must match the user's username
- unregistered: publishedData's `status` field must one of `PRIVATE`, `PUBLIC`
- public: publishedData's `status` field must be one of `PUBLIC`, `REGISTERED`, `AMENDED`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/published-data.ability.ts` and accessible elsewhere via `CaslAbilityFactory.publishedDataAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `PublishedDataAbility` module in `/src/casl/abilities/published-data.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for published data currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.

Read endpoints (`GET /`, `GET /count`, `GET /:id`) add an `$or` filter that matches published records plus the caller's own `private` records. The filter is combined with the client supplied `where` rather than replacing it.
Mutating endpoints (`PATCH /:id`, `POST /:id/register`, `POST /:id/resync`, and `DELETE /:id` on v4) build a filter on `doi` plus `createdBy` for non-admins, so a record belonging to somebody else is simply not found, and the same filter is reused for the write itself.
The lifecycle guard on `status` is applied after the record has been fetched, and is what distinguishes a `400 Bad Request` (found, but not modifiable in its current state) from a `404 Not Found` (not visible to the caller).

Since a record's only ownership information is `createdBy`, there is no group-based rule to express here, and no `ownerGroup`/`accessGroups` conditions appear in the ability.

## Temporary ownership model

Unlike datasets, samples, proposals and most other SciCat entities, the `PublishedData` schema does not extend `OwnableClass`: it has no `ownerGroup` and no `accessGroups` fields. The only ownership hint available is `createdBy`.

The `createdBy`-based rules described above were introduced as a hot fix for a security issue: on the v3 endpoints, any authenticated user could read any other user's `private` published data and could `PATCH` it, since those endpoints performed authentication but no further authorization (see [PR #2886](https://github.com/SciCatProject/backend/pull/2886)).

This is understood to be a temporary measure and knowingly deviates from the supported, group-based SciCat pattern. In particular:

- Only the exact creator of a record can act on it, whereas elsewhere in SciCat any member of the record's `ownerGroup` could.
- The "four eyes" workflow, in which a colleague reviews a `private` published data record before it is registered, is not possible through these endpoints.

The intended long-term solution is to make `PublishedData` extend `OwnableClass` and to migrate existing records so that `ownerGroup` and `accessGroups` are populated, after which the rules above should be replaced by the standard group-based checks. This is tracked in [issue #2900](https://github.com/SciCatProject/backend/issues/2900). The current model will be supported until that redesign is implemented.
