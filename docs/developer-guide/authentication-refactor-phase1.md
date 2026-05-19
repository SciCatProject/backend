---
title: Authentication refactor plan (phase 1)
audience: Technical
created_by: Copilot
created_on: 2026-05-19
---

## Scope

This document captures the **current authentication logic** and the **phase 1 refactor standards**.

Phase 1 is scoped to CASL authorization in backend services and controllers.

Out of scope for phase 1:

- OpenSearch / ElasticSearch authorization refactor

## Current authorization logic (baseline)

### Current structure summary

| Area | Current implementation |
| --- | --- |
| CASL rule source | `src/casl/casl-ability.factory.ts` (~2430 lines) |
| Action catalog | `src/casl/action.enum.ts` (215 action constants) |
| Endpoint-level rules | 16 `*EndpointAccess` methods in `CaslAbilityFactory` |
| Instance-level rules | 10 `*InstanceAccess` methods in `CaslAbilityFactory` |
| Service/controller filtering | Manual `ability.can(...)` checks and query mutation in controllers/services |
| Existing `@casl/mongoose` usage | Limited usage (`jobsMongoQueryReadAccess`, metadata keys controller) |

### Endpoint and instance access functions

| Domain | Endpoint rule function | Instance rule function |
| --- | --- | --- |
| datasets | `datasetEndpointAccess` | `datasetInstanceAccess` |
| opensearch | `opensearchEndpointAccess` | n/a (phase 1 ignores ES refactor) |
| jobs | `jobsEndpointAccess` | `jobsInstanceAccess` |
| instruments | `instrumentEndpointAccess` | n/a |
| logbooks | `logbookEndpointAccess` | n/a |
| origdatablocks | `origDatablockEndpointAccess` | `origDatablockInstanceAccess` |
| policies | `policyEndpointAccess` | n/a |
| proposals | `proposalsEndpointAccess` | `proposalsInstanceAccess` |
| publisheddata | `publishedDataEndpointAccess` | `publishedDataInstanceAccess` |
| samples | `samplesEndpointAccess` | `samplesInstanceAccess` |
| users | `userEndpointAccess` | n/a |
| attachments | `attachmentEndpointAccess` | `attachmentInstanceAccess` |
| history | `historyEndpointAccess` | `historyInstanceAccess` |
| datablocks | `datablockEndpointAccess` | `datablockInstanceAccess` |
| runtimeconfig | `runtimeConfigEndpointAccess` | n/a |
| metadataKeys | `metadataKeysEndpointAccess` | `metadataKeyInstanceAccess` |

### Controller/service hot spots with manual CASL branching

The following modules currently contain high volumes of direct `ability.can(...)` branching and/or manual query filtering:

| File | Approximate `ability.can(...)` checks |
| --- | --- |
| `src/datasets/datasets.controller.ts` | 108 |
| `src/samples/samples.controller.ts` | 57 |
| `src/proposals/proposals.controller.ts` | 54 |
| `src/datasets/datasets.v4.controller.ts` | 49 |
| `src/origdatablocks/origdatablocks.controller.ts` | 34 |
| `src/origdatablocks/origdatablocks.v4.controller.ts` | 34 |

Additional manual filter injection exists in `src/datasets/datasets-access.service.ts` where access checks are translated into `$lookup.pipeline` `$match` stages.

## Phase 1 refactor standards

### Objectives

- Keep refactor scoped to authorization.
- Move to JSON-driven CASL policy configuration from a single policy file.
- Validate policy JSON with JSON Schema validator (existing validator stack).
- Reduce auth logic to two layers:
  - Endpoint layer (guards/decorators, no instance conditions)
  - Instance layer (service-level DB filters/queries)
- Standardize instance filtering with `@casl/mongoose` `accessibleBy(...)`.
- Remove controller-level manual access filter injectors over time.
- Keep controllers focused on I/O and move auth business logic into services.

### Rule precedence

Apply rule generation in this order:

1. Defaults first
2. Group rules after defaults (group overrides defaults)
3. `can` before `cannot`
4. `cannot` after `can` for same scope (deny should win)

### Action model target

Use a compact action model per subject and per layer:

- Endpoint layer: `create | read | update | delete` (+ `manage` optional)
- Instance layer: `create | read | update | delete` (+ `manage` optional)

This replaces the current `ReadMany/ReadOwner/ReadAccess/...` action explosion.

### Subject mapping target

Policy JSON subject strings should map to canonical CASL subject classes in code (for consistent `detectSubjectType` and `accessibleBy` behavior).

Example mapping target:

```ts
export const SUBJECTS = {
  Dataset: DatasetClass,
  DatasetAttachment: DatasetClass,
  Proposal: ProposalClass,
  PublishedData: PublishedData,
  All: "all",
} as const;
```

### Placeholder handling target

Before ability generation, resolve placeholders from request user context:

- `{{user.currentGroups}}` -> `user.currentGroups`

If a placeholder resolves to `undefined`, fail with a clear error.

### Phase 1 implementation deliverables

1. Auth policy loader + JSON schema validation
2. JSON -> CASL translator (endpoint + instance builders)
3. Subject mapping layer (string -> class)
4. Placeholder transformer with validation
5. Unit tests for:
   - invalid policy shape
   - unknown subject/action errors
   - expected rule order (`can`/`cannot`, defaults/groups)
   - placeholder expansion and undefined placeholder handling
6. Service-level accessibleBy adoption for Mongo-backed authorization paths

### Notes for phase 2

- ElasticSearch / OpenSearch authorization changes are intentionally deferred.
