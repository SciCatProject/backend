# Users Authorization Model

This document describes the authorization model used for users and associated endpoints.

## Actions

The following actions are defined for users:

- `AccessAny`
- `UserCreate`
- `UserRead`
- `UserUpdate`
- `UserDelete`
- `UserCreateJwt`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

Unauthenticated users do not have access to user records.

### Authenticated

An authenticated user may create, read, update and delete their own user record, which matches the request user's `_id` to the user record's `_id`.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read, update and delete access to all user records. They are also permitted to create JWT tokens for any user.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` |
| - | - | - | - |
| `UserCreate` | - | own | any |
| `UserRead` | - | own | any |
| `UserUpdate` | - | own | any |
| `UserDelete` | - | own | any |
| `UserCreateJwt` | - | - | any |

Legend:
- own: user's `_id` must match the user record's `_id`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/users.ability.ts` and accessible elsewhere via `CaslAbilityFactory.userAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `UserAbility` module in `/src/casl/abilities/users.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for users currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.