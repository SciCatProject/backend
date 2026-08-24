# OPensearch Authorization Model

This document describes the authorization model used for opensearch and associated endpoints.

## Actions

The following actions are defined for opensearch:

- `Manage`

All opensearch endpoints are admin-only, therefore this one action is used to cover all permissions.

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

Unauthenticated users do not have access to opensearch endpoints.

### Authenticated

Authenticated users do not have access to opensearch endpoints.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted access to all opensearch endpoints.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` |
| - | - | - | - |
| `Manage` | - | - | any |

Legend:
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/opensearch.ability.ts` and accessible elsewhere via `CaslAbilityFactory.opensearchAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization. In the case of opensearch, there is only endpoint checks at this time.
