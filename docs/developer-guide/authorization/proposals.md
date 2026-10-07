# Proposals Authorization Model

This document describes the authorization model used for proposals and associated endpoints.

## Actions

The following actions are defined for proposals:

- `AccessAny`
- `ProposalCreate`
- `ProposalRead`
- `ProposalUpdate`
- `ProposalDelete`
- `ProposalAttachmentCreate`
- `ProposalAttachmentRead`
- `ProposalAttachmentUpdate`
- `ProposalAttachmentDelete`
- `ProposalDatasetRead`

`ProposalDatasetRead` permissions are not granted to any user at the moment (used to be granted to any authenticated user) due to a bug that allows full access to all datasets in the database.

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read proposals and linked attachments only if the proposal is public (the linked attachment's ownership is not considered).
Unauthenticated users do not have write access.

### Authenticated

An authenticated user may read proposals and linked attachments if the proposal is public or if they are a member of the proposal's `ownerGroup` or one of the `accessGroups` (the linked attachment's ownership is not considered).
Authenticated users do not have write access by default.

### PROPOSAL_GROUPS

If a user is part of a group listed in configuration as part of `PROPOSAL_GROUPS`, in addition to the permissions granted to authenticated users, they have unrestricted create, read and update access to all proposals. They may create linked attachments with no restrictions. They may update and delete linked attachments if the proposal's `ownerGroup` matches one of the user's `currentGroups`.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, in addition to the permissions granted to authenticated users, they have unrestricted create, read and update access to all proposals and linked attachments. They have unrestricted delete permissions for attachments linked to a proposal.

### DELETE_GROUPS

If a user is part of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all proposals in the database, but not for linked attachments.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `PROPOSAL_GROUPS` | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - | - |
| `ProposalCreate` | - | - | any | any | - |
| `ProposalRead` | public | public/owner/access | any | any | public/owner/access |
| `ProposalUpdate` | - | - | any | any | - |
| `ProposalDelete` | - | - | - | - | any |
| `ProposalAttachmentCreate` | - | - | any | any | - |
| `ProposalAttachmentRead` | public | public/owner/access | public/owner/access | any | public/owner/access |
| `ProposalAttachmentUpdate` | - | - | owner | any | - |
| `ProposalAttachmentDelete` | - | - | owner | any | - |
| `ProposalDatasetRead` | - | - | - | - | - |

Legend:
- public: proposal's `isPublished` field must be `true`
- owner: proposal's `ownerGroup` must match one of the user's `currentGroups`
- access: one of the proposal's `accessGroups` must match one of the user's `currentGroups`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/proposals.ability.ts` and accessible elsewhere via `CaslAbilityFactory.proposalAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `ProposalAbility` module in `/src/casl/abilities/proposals.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for proposals currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.