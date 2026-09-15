# Instruments Authorization Model

This document describes the authorization model used for instruments and associated endpoints.

## Actions

The following actions are defined for instruments:

- `InstrumentCreate`
- `InstrumentRead`
- `InstrumentUpdate`
- `InstrumentDelete`

## Permissions

Permissions are granted cumulatively to users based on their group association. Instruments are not `Ownable`, so there is no ownership-based conditions. The following permission levels are granted to users:

### Unauthenticated

An unauthenticated user may read any instrument record.
Unauthenticated users do not have write access.

### Authenticated

An authenticated user may read any instrument record.
Authenticated users do not have write access by default.

### ADMIN_GROUPS

If a user is a member of a group listed in configuration as part of `ADMIN_GROUPS`, they have unrestricted create and update access to all instruments in addition to unrestricted read access for authenticated users.

### DELETE_GROUPS

If a user is a member of a group listed in configuration as part of `DELETE_GROUPS`, they have unrestricted delete access to all instruments in addition to unrestricted read access for authenticated users.

## Permission Matrix

Table of the different permission classes defined in casl. For all special permission groups, the full list includes the relevant permissions passed on from generic authenticated user permissions.

| Operation | Unauthenticated | Authenticated | `ADMIN_GROUPS` | `DELETE_GROUPS` |
| - | - | - | - | - |
| `InstrumentCreate` | - | - | any | - |
| `InstrumentRead` | any | any | any | any |
| `InstrumentUpdate` | - | - | any | - |
| `InstrumentDelete` | - | - | - | any |

Legend:
- any: unrestricted access

## Implementation Notes

The definition is implemented in the casl module under `/src/casl/abilities/instruments.ability.ts` and accessible elsewhere via `CaslAbilityFactory.instrumentAccess`. This one function is used to build one casl ability for endpoint and instance authorization: When a user receives permission for an action under some instance-level condition, they should implicitly pass endpoint authorization.

The `InstrumentAbility` module in `/src/casl/abilities/instruments.ability.ts` is written in such a way that permissions are cumulative. In case multiple rules apply, casl will chain them in a logical or, ultimately giving precedence to the broadest applicable rule. The special permission groups are sorted roughly in ascending order of privilege level.
In case there are expectations of mutual exclusivity for certain special groups (not the case for instruments currently), additional rules using the `cannot` ability expression can be added after all `can` rules have been defined. For an example, see the jobs subsystem authorization docs.