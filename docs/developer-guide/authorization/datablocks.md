# Datablocks Authorization Model

This document describes the authorization model used for datablocks and associated endpoints.

## Actions

The following actions are defined for datablocks:

- `DatablockCreate`
- `DatablockRead`
- `DatablockUpdate`
- `DatablockDelete`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read datablocks only if the datablock is public.
Unauthenticated users do not have write access.

### Authenticated

An authenticated user may read datablocks if the datablock is public or if they are a member of the datablock's `ownerGroup` or one of the `accessGroups`. They are permitted to update datablocks if the `ownerGroup` matches one of the user's `currentGroups`.

### CREATE_DATASET_GROUPS

If a user is part of a group listed in configuration as part of `CREATE_DATASET_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create and update datablocks for any `ownerGroup`.

### CREATE_DATASET_WITH_PID_GROUPS

These groups have the same permissions as `CREATE_DATASET_GROUPS`.

### CREATE_DATASET_PRIVILEGED_GROUPS

These groups have the same permissions as `CREATE_DATASET_GROUPS`.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read, and update access to all datablocks in the database.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted read, update and delete access to all datablocks in the database.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `CREATE_DATASET_GROUPS`/`CREATE_DATASET_WITH_PID_GROUPS`/`CREATE_DATASET_PRIVILEGED_GROUPS` | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - | - |
| `DatablockCreate` | - | - | any | any | - |
| `DatablockRead` | public | public/owner/access | public/owner/access | any | any |
| `DatablockUpdate` | - | owner | any | any | any |
| `DatablockDelete` | - | - | - | - | any |

Legend:
- public: datablock's `isPublished` field must be `true`
- owner: datablock's `ownerGroup` must match one of the user's `currentGroups`
- access: one of the datablock's `accessGroups` must match one of the user's `currentGroups`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/datablocks/datablocks.ability.ts` and accessible elsewhere via `CaslAbilityFactory.datablockAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `DatablockAbility` module in `/src/casl/datablocks/datablocks.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for datablocks currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.