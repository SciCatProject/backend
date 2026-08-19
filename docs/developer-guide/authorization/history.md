# History Authorization Model

This document describes the authorization model used for history and associated endpoints.

## Actions

The following actions are defined for history:

- `HistoryRead`

Creation and updates are managed by the backend for subsystems with history tracking enabled. There is no endpoint in the API that enables history deletion.

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

Unauthenticated users cannot access any history record.

### Authenticated

Authenticated users cannot access any history record by default.

### HISTORY_ACCESS_ATTACHMENT_GROUPS

If a user is a member of a group listed in configuration as part of `HISTORY_ACCESS_ATTACHMENT_GROUPS`, they are permitted to read history entries that describe `Attachment` records, regardless of record ownership.

### HISTORY_ACCESS_DATABLOCK_GROUPS

If a user is a member of a group listed in configuration as part of `HISTORY_ACCESS_DATABLOCK_GROUPS`, they are permitted to read history entries that describe `Datablock` records, regardless of record ownership.

### HISTORY_ACCESS_DATASET_GROUPS

If a user is a member of a group listed in configuration as part of `HISTORY_ACCESS_DATASET_GROUPS`, they are permitted to read history entries that describe `Dataset` records, regardless of record ownership.

### HISTORY_ACCESS_INSTRUMENT_GROUPS

If a user is a member of a group listed in configuration as part of `HISTORY_ACCESS_INSTRUMENT_GROUPS`, they are permitted to read history entries that describe `Instrument` records, regardless of record ownership.

### HISTORY_ACCESS_POLICIES_GROUPS

If a user is a member of a group listed in configuration as part of `HISTORY_ACCESS_POLICIES_GROUPS`, they are permitted to read history entries that describe `Policy` records, regardless of record ownership.

### HISTORY_ACCESS_PROPOSAL_GROUPS

If a user is a member of a group listed in configuration as part of `HISTORY_ACCESS_PROPOSAL_GROUPS`, they are permitted to read history entries that describe `Proposal` records, regardless of record ownership.

### HISTORY_ACCESS_PUBLISHED_DATA_GROUPS

If a user is a member of a group listed in configuration as part of `HISTORY_ACCESS_PUBLISHED_DATA_GROUPS`, they are permitted to read history entries that describe `PublishedData` records, regardless of record ownership.

### HISTORY_ACCESS_SAMPLE_GROUPS

If a user is a member of a group listed in configuration as part of `HISTORY_ACCESS_SAMPLE_GROUPS`, they are permitted to read history entries that describe `Sample` records, regardless of record ownership.

### ADMIN_GROUPS

If a user is a member of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted read access to all history entries for all subsystems.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `HISTORY_ACCESS_ATTACHMENT_GROUPS` | `HISTORY_ACCESS_DATABLOCK_GROUPS` | `HISTORY_ACCESS_DATASET_GROUPS` | `HISTORY_ACCESS_INSTRUMENT_GROUPS` | `HISTORY_ACCESS_POLICIES_GROUPS` | `HISTORY_ACCESS_PROPOSAL_GROUPS` | `HISTORY_ACCESS_PUBLISHED_DATA_GROUPS` | `HISTORY_ACCESS_SAMPLE_GROUPS` | `ADMIN_GROUPS` |
| - | - | - | - | - | - | - | - | - | - | - | - |
| `HistoryRead` | - | - | any `Attachment` | any `Datablock` | any `Dataset` | any `Instrument` | any `Policy` | any `Proposal` | any `PublishedData` | any `Sample` | any |

Legend:
- any _`Collection`_: unrestricted access to history entries belonging to the subsystem _`Collection`_
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/history.ability.ts` and accessible elsewhere via `CaslAbilityFactory.historyAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization. 

Unlike other subsystems, endpoint and instance permissions are still separated into two rules in `HistoryAbility`. Endpoint access is granted with `can(Action.HistoryRead, GenericHistory)`, wheresas instance access is granted by `can(Action.HistoryRead, DatasetClass)` for datasets for example. When a scoped instance permission is granted in a branch, the generic endpoint access rule must be added as well. Technically the `GenericHistory` subject could be eliminated, but would make the expression needed in the controller unreadable.

The `HistoryAbility` module in `/src/casl/abilities/history.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for history currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.