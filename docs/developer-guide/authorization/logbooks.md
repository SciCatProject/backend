# Logbooks Authorization Model

This document describes the authorization model used for logbooks and associated endpoints.

## Actions

The following actions are defined for logbooks:

- `Read`

## Permissions

Permissions are granted based on authentication status:

### Unauthenticated

An unauthenticated user may not read logbook records.

### Authenticated

An authenticated user may read any logbook record.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated |
| - | - | - |
| `Read` | - | any |

Legend:
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/logbooks.ability.ts` and accessible elsewhere via `CaslAbilityFactory.logbookAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.
