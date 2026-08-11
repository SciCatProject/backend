# Samples Authorization Model

This document describes the authorization model used for samples and associated endpoints.

## Actions

The following actions are defined for samples:

- `SampleCreate`
- `SampleRead`
- `SampleUpdate`
- `SampleDelete`
- `SampleAttachmentCreate`
- `SampleAttachmentRead`
- `SampleAttachmentUpdate`
- `SampleAttachmentDelete`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read samples and linked attachments only if the sample is public (the linked attachment's ownership is not considered).
Unauthenticated users do not have write access.

### Authenticated

An authenticated user may read samples and linked attachments if the sample is public or if they are a member of the sample's `ownerGroup` or one of the `accessGroups` (the linked attachment's ownership is not considered).
Authenticated users do not have write access by default.

### SAMPLE_GROUPS

If a user is part of a group listed in configuration as part of `SAMPLE_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create and update samples and linked attachments if the `ownerGroup` matches one of the user's `currentGroups`. Importantly, it is not necessary that `ownerGroup` be in `SAMPLE_GROUPS`. They are additionally permitted to delete attachments linked to samples where the `ownerGroup` matches one of the user's `currentGroups`.

This permission can be extended to all authenticated users by providing the token `#all` under `SAMPLE_GROUPS` in configuration.

### SAMPLE_PRIVILEGED_GROUPS

If a user is part of a group listed in configuration as part of `SAMPLE_PRIVILEGED_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create samples and linked attachments for any `ownerGroup`.
They may update samples and linked attachments if the `ownerGroup` matches one of the user's `currentGroups`.
They are additionally permitted to delete attachments linked to samples where the `ownerGroup` matches one of the user's `currentGroups`.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read and update access to all samples and linked attachments, and additionally unrestricted delete access to linked attachments.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all samples and linked attachments in the database.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `SAMPLE_GROUPS` | `SAMPLE_PRIVILEGED_GROUPS` | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - | - | - |
| `SampleCreate` | - | - | owner | any | any | - |
| `SampleRead` | public | public/owner/access | public/owner/access | public/owner/access | any | public/owner/access |
| `SampleUpdate` | - | - | owner | owner | any | - |
| `SampleDelete` | - | - | - | - | - | any |
| `SampleAttachmentCreate` | - | - | owner | any | any | - |
| `SampleAttachmentRead` | public | public/owner/access | public/owner/access | public/owner/access | any | public/owner/access |
| `SampleAttachmentUpdate` | - | - | owner | owner | any | - |
| `SampleAttachmentDelete` | - | - | owner | owner | any | any |

Legend:
- public: sample's `isPublished` field must be `true`
- owner: sample's `ownerGroup` must match one of the user's `currentGroups`
- access: one of the sample's `accessGroups` must match one of the user's `currentGroups`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/samples.ability.ts` and accessible elsewhere via `CaslAbilityFactory.sampleAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `SampleAbility` module in `/src/casl/abilities/samples.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for samples currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.