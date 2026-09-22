# Origdatablocks Authorization Model

This document describes the authorization model used for origdatablocks and associated endpoints.

## Actions

The following actions are defined for origdatablocks:

- `AccessAny`
- `OrigdatablockCreate`
- `OrigdatablockRead`
- `OrigdatablockUpdate`
- `OrigdatablockDelete`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read origdatablocks only if the origdatablock is public.
Unauthenticated users do not have write access.

### Authenticated

An authenticated user may read origdatablocks if the origdatablock is public or if they are a member of the origdatablock's `ownerGroup` or one of the `accessGroups`.

Authenticated users do not have write access by default.

### CREATE_DATASET_GROUPS

If a user is part of a group listed in configuration as part of `CREATE_DATASET_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create and update origdatablocks if the `ownerGroup` matches one of the user's `currentGroups`. Importantly, it is not necessary that `ownerGroup` be in `CREATE_DATASET_GROUPS`.

This permission can be extended to all authenticated users by providing the token `#all` under `CREATE_DATASET_GROUPS` in configuration.

### CREATE_DATASET_WITH_PID_GROUPS

If a user is part of a group listed in configuration as part of `CREATE_DATASET_WITH_PID_GROUPS`, they receive identical rights to members of `CREATE_DATASET_GROUPS` with regard to origdatablocks.

### CREATE_DATASET_PRIVILEGED_GROUPS

If a user is part of a group listed in configuration as part of `CREATE_DATASET_PRIVILEGED_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create origdatablocks for any `ownerGroup`.
They may update origdatablocks if the `ownerGroup` matches one of the user's `currentGroups`.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read and update access to all origdatablocks.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all origdatablocks in the database.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `CREATE_DATASET_GROUPS` | `CREATE_DATASET_WITH_PID_GROUPS` | `CREATE_DATASET_PRIVILEGED_GROUPS` | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - | - | - | - |
| `OrigdatablockCreate` | - | - | owner | owner | any | any | - |
| `OrigdatablockRead` | public | public/owner/access | public/owner/access | public/owner/access | public/owner/access | any | public/owner/access |
| `OrigdatablockUpdate` | - | - | owner | owner | owner | any | - |
| `OrigdatablockDelete` | - | - | - | - | - | - | any |

Legend:
- public: origdatablock's `isPublished` field must be `true`
- owner: origdatablock's `ownerGroup` must match one of the user's `currentGroups`
- access: one of the origdatablock's `accessGroups` must match one of the user's `currentGroups`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/origdatablocks.ability.ts` and accessible elsewhere via `CaslAbilityFactory.origdatablockAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `OrigDatablockAbility` module in `/src/casl/abilities/origdatablocks.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for origdatablocks currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.