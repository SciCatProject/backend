# Published Data Authorization Model

This document describes the authorization model used for published data and associated endpoints.

## Actions

The following actions are defined for published data:

- `AccessAny`
- `Create`
- `Read`
- `Update`
- `Delete`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

Unauthenticated users do not have casl permissions to interact with published data records. However, all read endpoints are unguarded with the `@AllowAny` decorator, effectively giving unauthenticated users unrestricted read access.
Additional access restrictions are enforced at the controller level in API v4 only:
Read access is limited to published data records with status `PUBLIC`, `REGISTERED` or `AMENDED`.

### Authenticated

An authenticated user has unrestricted create, read and update casl permissions for any published data record. Additional access restrictions are enforced at the controller level in API v4 only:
Read access is limited to published data records with status `PUBLIC`, `REGISTERED` or `AMENDED` and records with status `PRIVATE` if the user is listed under the record's `createdBy` field.
Update access is limited to `PRIVATE` records with the user listed under the record's `createdBy` field.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read and update casl permissions. For API v4, they are only allowed to update records with `PRIVATE` or `PUBLIC` status, regardless of ownership.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all published data records in the database.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

### API v3

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - |
| `Create` | - | any | any | - |
| `Read` | any | any | any | any |
| `Update` | - | any | any | - |
| `Delete` | - | - | - | any |

### API v4

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - |
| `Create` | - | any | any | - |
| `Read` | public | public/owner | any | public/owner |
| `Update` | - | owner | unregistered | - |
| `Delete` | - | - | - | any |

Legend:
- owner: publishedData's `status` field must be `PRIVATE` and the `createdBy` field must match the user's username
- unregistered: publishedData's `status` field must one of `PRIVATE`, `PUBLIC`
- public: publishedData's `status` field must be one of `PUBLIC`, `REGISTERED`, `AMENDED`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/published-data.ability.ts` and accessible elsewhere via `CaslAbilityFactory.publishedDataAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `PublishedDataAbility` module in `/src/casl/abilities/published-data.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for published data currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.