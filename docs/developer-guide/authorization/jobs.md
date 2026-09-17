# Jobs Authorization Model

This document describes the authorization model used for jobs and associated endpoints.

## Actions

The following actions are defined for jobs:

- `JobCreate`
- `JobRead`
- `JobUpdate`
- `JobDelete`

## Permissions

Permissions are granted cumulatively to users based on their group association. A specialty of jobs is that they possess a secondary authorization layer based on the job configuration. Each job type can be configured to grant create and update permissions separately for that type. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may create jobs that are configured to accept `#all` or `#datasetPublic` in their create.auth field. They are also permitted to update jobs that are configured to accept `#all` in their update.suth field.
Unauthenticated users do not have read access to jobs.

### Authenticated

An authenticated user may read jobs if their username matches the job's `ownerUser` of that job or if they are a member of the job's `ownerGroup`.

They are permitted to create jobs of a certain job type if the corresponding create.auth field is configured to:
- Any wildcard except `#jobAdmin` (`#all`, `#datasetPublic`, `#authenticated`, `#datasetAccess`, `#datasetOwner`)
- A group `@g` that the user is a member of
- The user's exact username

They are permitted to update jobs of a certain type it the corresponding update.auth field is configured to:
- `#all`
- `#jobOwnerUser` if the job's `ownerUser` matches the username
- `#jobOwnerGroup` if the user is a member of the job's `ownerGroup`
- A group `@g` that the user is a member of
- The user's exact username

### CREATE_JOB_PRIVILEGED_GROUPS

If a user is part of a group listed in configuration as part of `CREATE_JOB_PRIVILEGED_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create and read jobs of any type for any `ownerGroup` or `ownerUser`.

__Special case__: If a user is a member of one of the `CREATE_JOB_PRIVILEGED_GROUPS` and is simultaneously not a member of one of the `UPDATE_JOB_PRIVILEGED_GROUPS` or `ADMIN_GROUPS`, they lose all permissions to update jobs, even if the job configuration would otherwise allow it.

### UPDATE_JOB_PRIVILEGED_GROUPS

If a user is part of a group listed in configuration as part of `UPDATE_JOB_PRIVILEGED_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to update and read jobs of any type for any `ownerGroup` or `ownerUser`.

__Special case__: If a user is a member of one of the `UPDATE_JOB_PRIVILEGED_GROUPS` and is simultaneously not a member of one of the `CREATE_JOB_PRIVILEGED_GROUPS` or `ADMIN_GROUPS`, they lose all permissions to create jobs, even if the job configuration would otherwise allow it.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read and update access to all jobs.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all jobs.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions. For the matrix, it is assumed that special group membership is exclusive and the special cases apply.

| Operation | Unauthenticated | Authenticated | `CREATE_JOB_PRIVILEGED_GROUPS` | `UPDATE_JOB_PRIVILEGED_GROUPS` | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - | - | - |
| `JobCreate` | configPublic | config | any | - | any | - |
| `JobRead` | - | owner | any | any | any | owner |
| `JobUpdate` | configPublic | config | - | any | any | - |
| `JobDelete` | - | - | - | - | - | any |

Legend:
- configPublic: auth configuration value for a job type must allow public access
- config: auth configuration value for a job type must allow access for the user
- owner: job's `ownerGroup` must match one of the user's `currentGroups` or job's `ownerUser` must match the user's username
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/jobs.ability.ts` and accessible elsewhere via `CaslAbilityFactory.jobAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `JobAbility` module in `/src/casl/abilities/jobs.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.

To accomodate the special loss of permissions for exclusive members of `CREATE_JOB_PRIVILEGED_GROUPS` and `UPDATE_JOB_PRIVILEGED_GROUPS`, an additional set of rules based on the `cannot` casl term are added after all `can` rules have been set. To prevent ambiguity in the expression of casl rules, the ability builder functions must always be structured in two blocks: First, all rules with `can` are set up, and rules using `cannot` to constrain special cases come second.