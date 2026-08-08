# Policies Authorization Model

This document describes the authorization model used for policies and associated endpoints.

## Actions

The following actions are defined for policies:

- `Create`
- `Read`
- `Update`
- `Delete`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

Unauthenticated users do not have access to policy records.

### Authenticated

Unauthenticated users do not have access to policy records by default.

### POLICY_GROUPS

If a user is part of a group listed in configuration as part of `POLICY_GROUPS`, they have unrestricted create, read and update access to all policies.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read and update access to all policies.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all policies in the database.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `POLICY_GROUPS` | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - | - |
| `Create` | - | - | any | any | - |
| `Read` | - | - | any | any | - |
| `Update` | - | - | any | any | - |
| `Delete` | - | - | - | - | any |

Legend:
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/policies.ability.ts` and accessible elsewhere via `CaslAbilityFactory.policyAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `PolicyAbility` module in `/src/casl/abilities/policies.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for policies currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.