# Attachments Authorization Model

This document describes the authorization model used for attachments and associated endpoints.

## Actions

The following actions are defined for attachments:

- `AttachmentCreate`
- `AttachmentRead`
- `AttachmentUpdate`
- `AttachmentDelete`

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read attachments only if the attachment is public.
Unauthenticated users do not have write access.

### Authenticated

An authenticated user may read attachments if the attachment is public or if they are a member of the attachment's `ownerGroup` or one of the `accessGroups`.

Authenticated users do not have write access by default.

### ATTACHMENT_GROUPS

If a user is part of a group listed in configuration as part of `ATTACHMENT_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create, update and delete attachments if the `ownerGroup` matches one of the user's `currentGroups`. Importantly, it is not necessary that `ownerGroup` be in `ATTACHMENT_GROUPS`.

This permission can be extended to all authenticated users by providing the token `#all` under `ATTACHMENT_GROUPS` in configuration.

### ATTACHMENT_PRIVILEGED_GROUPS

If a user is part of a group listed in configuration as part of `ATTACHMENT_PRIVILEGED_GROUPS`, in addition to the permissions granted to authenticated users, they are permitted to create attachments for any `ownerGroup`.
They may update and delete attachments if the `ownerGroup` matches one of the user's `currentGroups`.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create, read, update and delete access to all attachments.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all attachments in the database.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `ATTACHMENT_GROUPS` | `ATTACHMENT_PRIVILEGED_GROUPS` | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - | - | - |
| `AttachmentCreate` | - | - | owner | any | any | - |
| `AttachmentRead` | public | public/owner/access | public/owner/access | public/owner/access | any | public/owner/access |
| `AttachmentUpdate` | - | - | owner | owner | any | - |
| `AttachmentDelete` | - | - | owner | owner | any | any |

Legend:
- public: attachment's `isPublished` field must be `true`
- owner: attachment's `ownerGroup` must match one of the user's `currentGroups`
- access: one of the attachment's `accessGroups` must match one of the user's `currentGroups`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/attachments.ability.ts` and accessible elsewhere via `CaslAbilityFactory.attachmentAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `AttachmentAbility` module in `/src/casl/abilities/attachments.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for attachments currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.