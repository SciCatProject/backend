# Metadata Keys Authorization Model

This document describes the authorization model used for metadata keys and associated endpoints.

## Actions

The following actions are defined for metadata keys:

- `MetadataKeyRead`

All write actions (create/update/delete) are system-managed based on datasets and do not have API endpoints.

## Permissions

Permissions are granted cumulatively to users based on their group association. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read metadata keys only if the metadata key is public.

### Authenticated

An authenticated user may read metadata keys if the metadata key is public or if they are a member of the metadata keys's `ownerGroup` or one of the `accessGroups`.

### ADMIN_GROUPS

If a user is part of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted read access to all metadata keys.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` |
| - | - | - | - |
| `MetadataKeyRead` | public | public/owner/access | any |

Legend:
- public: metadata key's `isPublished` field must be `true`
- owner: metadata key's `ownerGroup` must match one of the user's `currentGroups`
- access: one of the metadata key's `accessGroups` must match one of the user's `currentGroups`
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/metadata-keys.ability.ts` and accessible elsewhere via `CaslAbilityFactory.metadataKeyAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `MetadataKeyAbility` module in `/src/casl/abilities/metadata-keys.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for metadata keys currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.