# Datasets Authorization Model

This document describes the authorization model used for datasets and associated endpoints.

## Actions

The following actions are defined for datasets:

- `DatasetCreate`
- `DatasetRead`
- `DatasetUpdate`
- `DatasetDelete`
- `DatasetLifecycleUpdate`
- `DatasetAttachmentCreate`
- `DatasetAttachmentRead`
- `DatasetAttachmentUpdate`
- `DatasetAttachmentDelete`
- `DatasetOrigdatablockCreate`
- `DatasetOrigdatablockRead`
- `DatasetOrigdatablockUpdate`
- `DatasetOrigdatablockDelete`
- `DatasetDatablockCreate`
- `DatasetDatablockRead`
- `DatasetDatablockUpdate`
- `DatasetDatablockDelete`
- `DatasetLogbookRead`

The first four actions are the major actions used on most endpoints. `DatasetLifecycleUpdate` is used for a special update endpoint with strict control on the request content.
The other actions are used for specific endpoints giving access to linked resources from a given dataset, and exist mostly for compatibility with API v3.

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read datasets and associated attachments, datablocks and origdatablocks only if the dataset is public. This checks the `isPublished` field only on the dataset, linked attachments, datablocks and origdatablocks inherit the public status.

Unauthenticated users do not have write access.

### Authenticated

An authenticated user may read any datasets and associated attachments, datablocks and origdatablocks if the dataset is public or if they are a member of the dataset's `ownerGroup` or one of the `accessGroups`. Access to linked attachments, datablocks and origdatablocks is inherited from the dataset.

Authenticated users do not have write access by default.

### CREATE_DATASET_GROUPS

If a user is part of a group listed in configuration as part of `CREATE_DATASET_GROUPS`, in addition to the permissions granted to authenticated users, they are allowed to create and update datasets and linked attachments, datablocks and origdatablocks if the `ownerGroup` matches one of the user's `currentGroups`. Importantly, it is not necessary that `ownerGroup` be in `CREATE_DATASET_GROUPS`.
Users in this category may delete attachments linked to an owned dataset, but no other resources.
On dataset create requests, users in this category are not permitted to provide an explicit `pid`, it must be generated from the backend.

This permission can be extended to all authenticated users by providing the token `#all` under `CREATE_DATASET_GROUPS` in configuration.

### CREATE_DATASET_WITH_PID_GROUPS

If a user is part of a group listed in configuration as part of `CREATE_DATASET_WITH_PID_GROUPS`, the permission are identical to `CREATE_DATASET_GROUPS` with one exception:
On dataset create requests, users in this category are permitted to provide an explicit `pid` to supersede the backend's automatic generation.

This permission can be extended to all authenticated users by providing the token `#all` under `CREATE_DATASET_WITH_PID_GROUPS` in configuration.

### CREATE_DATASET_PRIVILEGED_GROUPS

If a user is part of a group listed in configuration as part of `CREATE_DATASET_PRIVILEGED_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create datasets and linked attachments, datablocks and origdatablocks for any `ownerGroup`.
They may update datasets and linked attachments, datablocks and origdatablocks only if the `ownerGroup` matches one of the user's `currentGroups`.
They may delete attachments linked to an owned dataset.

### UPDATE_DATASET_LIFECYCLE_GROUPS

If a user is part of a group listed in configuration as part of `UPDATE_DATASET_LIFECYCLE_GROUPS`, they receive unrestricted read access to all datasets, but not to linked attachments, datablocks and origdatablocks.
They may use the `/datasets/:id/datasetlifecycle` endpoint for any dataset, which is limited to only accept changes to the dataset's `datasetLifecycle` field.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read and update access to all datasets and all linked attachments, datablocks and origdatablocks in the database. They also have unrestricted delete access to any attachments linked to any dataset.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all datasets and all linked attachments, datablocks and origdatablocks in the database.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `CREATE_DATASET_GROUPS` | `CREATE_DATASET_WITH_PID_GROUPS` | `CREATE_DATASET_PRIVILEGED_GROUPS` | `UPDATE_DATASET_LIFECYCLE_GROUPS` | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - | - | - | - | - |
| `DatasetCreate` | - | - | owner, no `pid` | owner | any | - | any | - |
| `DatasetRead` | public | public/owner/access | public/owner/access | public/owner/access | public/owner/access | any | any | public/owner/access |
| `DatasetUpdate` | - | - | owner | owner | owner | - | any | - |
| `DatasetDelete` | - | - | - | - | - | - | - | any |
| `DatasetLifecycleUpdate` | - | - | owner | owner | owner | any | any | - |
| `DatasetAttachmentCreate` | - | - | owner | owner | any | - | any | - |
| `DatasetAttachmentRead` | public | public/owner/access | public/owner/access | public/owner/access | public/owner/access | any | any | public/owner/access |
| `DatasetAttachmentUpdate` | - | - | owner | owner | owner | - | any | - |
| `DatasetAttachmentDelete` | - | - | owner | owner | owner | - | any | any |
| `DatasetOrigdatablockCreate` | - | - | owner | owner | any | - | any | - |
| `DatasetOrigdatablockRead` | public | public/owner/access | public/owner/access | public/owner/access | public/owner/access | any | any | public/owner/access |
| `DatasetOrigdatablockUpdate` | - | - | owner | owner | owner | - | any | - |
| `DatasetOrigdatablockDelete` | - | - | - | - | - | - | - | any |
| `DatasetDatablockCreate` | - | - | owner | owner | any | - | any | - |
| `DatasetDatablockRead` | public | public/owner/access | public/owner/access | public/owner/access | public/owner/access | any | any | public/owner/access |
| `DatasetDatablockUpdate` | - | - | owner | owner | owner | - | any | - |
| `DatasetDatablockDelete` | - | - | - | - | - | - | - | any |
| `DatasetLogbookRead` | - | owner | owner | owner | owner | owner | any | owner |

Legend:
- public: dataset's `isPublished` field must be `true`
- owner: dataset's `ownerGroup` must match one of the user's `currentGroups`
- access: one of the dataset's `accessGroups` must match one of the user's `currentGroups`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/datasets.ability.ts` and accessible elsewhere via `CaslAbilityFactory.datasetAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `DatasetAbility` module in `/src/casl/abilities/datasets.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for datasets currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.