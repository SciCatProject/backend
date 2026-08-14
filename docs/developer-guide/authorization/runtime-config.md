# Runtime Config Authorization Model

This document describes the authorization model used for runtime config and associated endpoints.

## Actions

The following actions are defined for runtime config:

- `RuntimeConfigRead`
- `RuntimeConfigUpdate`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read any runtime configuration.

### Authenticated

An authenticated user may read any runtime configuration.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they may read and update any runtime configuration.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` |
| - | - | - | - |
| `RuntimeConfigRead` | any | any | any |
| `RuntimeConfigUpdate` | - | - | any |

Legend:
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/runtime-config.ability.ts` and accessible elsewhere via `CaslAbilityFactory.runtimeConfigAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.
