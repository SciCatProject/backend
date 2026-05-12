---
title: MetadataKeys Synchronization Service Overview
audience: Technical
created_by: Junjie Quan
created_on: 2026-02-09
---

## Overview & Problem Statement

The Metadata Keys Module is a dedicated standalone component designed to manage and retrieve metadata keys across the platform. This module replaces the legacy GET /datasets/metadataKeys endpoint.

### Problem Addressed

The previous implementation in the Datasets service lacked a permission-based filtering layer. Because it attempted to return all global keys without ownership validation, it caused:

- Performance: Significant latency when processing large datasets.
- Stability: Crashes occurred when retrieval limits were missing or improperly configured.
- Risks: Users could see metadata keys they did not have permissions to access.

---

## Module Architecture

This module consists of a dedicated Controller and Service layer that implements a robust permission-aware logic.

### MetadataKeysController

Provides the API interface for searching metadata keys.

- **Endpoint**: `GET /metadatakeys` (replaces `GET /datasets/metadataKeys`)
- **Method**: `findAll`
- **Access**: Any authenticated user (permission filtering is applied server-side)
- Allowed filter fields: see `src/metadata-keys/types/metadatakeys-lookup.ts`
- Filter examples: see `src/metadata-keys/types/metadatakeys-filter-content.ts`

---

### MetadataKeysService

Handles business logic and database access. Split into two concerns:

#### 1. User-facing search — `findAll`

Applies CASL permission filters before querying:

| User type            | Visible keys                                             |
| -------------------- | -------------------------------------------------------- |
| Admin                | All keys in the system                                   |
| Authenticated user   | Keys where they belong to `ownerGroup` or `accessGroups` |
| Unauthenticated user | Keys marked `isPublished: true`                          |

Results default to 100 per page if no limit is provided.

#### 2. Internal synchronization

These methods are called internally when source documents are created, updated, or deleted. They are never called directly from the controller.

##### `insertManyFromSource(doc)`

Called when a dataset is **created** or **gains new metadata keys**.

For each key in `scientificMetadata`:

- Upserts a `MetadataKey` document identified by `${sourceType}_${key}_${humanReadableName}`
- Increments `usageCount` (total datasets referencing this key)
- Increments per-group reference counts in `userGroupCounts`
- Adds new groups to the `userGroups` query array via `$addToSet`
- Sets `isPublished: true` if the source dataset is published (never unsets inline — the cronjob handles the `true → false` transition)

##### `deleteMany(doc)`

Called when a dataset is **deleted** or **loses metadata keys**.

Runs three sequential steps:

1. Decrements `usageCount` and per-group counts in `userGroupCounts`
2. Recomputes the `userGroups` array from the updated counts — drops any group whose count reached zero
3. Deletes `MetadataKey` documents where `usageCount <= 0`
   `usageCount` is the authoritative deletion signal. A dataset with no `userGroups` and `isPublished: false` would be invisible to both `userGroupCounts` and `isPublished` checks, so neither alone can substitute for it.

##### `replaceManyFromSource(oldDoc, newDoc)`

Called when a dataset is **updated**. Diffs the old and new `scientificMetadata` to produce three disjoint key sets:

| Set     | Keys             | Action                                                               |
| ------- | ---------------- | -------------------------------------------------------------------- |
| Added   | Only in `newDoc` | `insertManyFromSource`                                               |
| Removed | Only in `oldDoc` | `deleteMany`                                                         |
| Shared  | In both          | `updateSharedKeys` (group / isPublished / humanReadableName changes) |

The three sets are disjoint by `_id` so they run in parallel via `Promise.all`.

For shared keys, three things are handled independently:

- **userGroups changed** — added groups are incremented, removed groups are decremented, then `userGroups` array is recomputed from the updated counts
- **isPublished flipped true** — sets `isPublished: true` inline; `false` is left to the cronjob
- **humanReadableName changed** — since `humanReadableName` is part of `_id`, this is treated as a delete of the old document + insert of a new one

---

## Schema

Each `MetadataKey` document has the following key fields:

| Field               | Type                  | Description                                                                              |
| ------------------- | --------------------- | ---------------------------------------------------------------------------------------- |
| `_id`               | `string`              | Composite key: `${sourceType}_${key}_${humanReadableName}`                               |
| `key`               | `string`              | The raw metadata key name                                                                |
| `humanReadableName` | `string`              | Human-readable label from `human_name`, empty string if absent                           |
| `sourceType`        | `string`              | Source collection: `Dataset`, `Proposal`, `Sample`, etc.                                 |
| `userGroups`        | `string[]`            | Groups that can see this key — kept in sync with `userGroupCounts` for query performance |
| `userGroupCounts`   | `Map<string, number>` | Per-group reference counts — source of truth for safe group removal                      |
| `usageCount`        | `number`              | Total datasets referencing this key — authoritative deletion signal                      |
| `isPublished`       | `boolean`             | True if any contributing dataset is published                                            |

`userGroups` and `userGroupCounts` are intentionally redundant. `userGroupCounts` owns the truth and enables safe atomic decrements. `userGroups` is a denormalized array kept for query performance — MongoDB's multikey index on `userGroups` makes `{ userGroups: { $in: [...] } }` efficient in a way that querying Map keys directly is not.

---

## Filter Examples

List metadata keys visible to the current user for a given source type:

```json
{
  "where": {
    "sourceType": "Dataset"
  },
  "fields": ["key", "humanReadableName"],
  "limits": {
    "limit": 10,
    "skip": 0,
    "sort": {
      "createdAt": "desc"
    }
  }
}
```

Find a specific key by name:

```json
{
  "where": {
    "sourceType": "Dataset",
    "key": "temperature"
  },
  "limits": {
    "limit": 1,
    "skip": 0
  }
}
```

Partial search on `key`:

```json
{
  "where": {
    "sourceType": "Dataset",
    "key": { "$regex": "temp", "$options": "i" }
  },
  "limits": {
    "limit": 10,
    "skip": 0
  }
}
```

Partial search on `humanReadableName`:

```json
{
  "where": {
    "sourceType": "Dataset",
    "humanReadableName": { "$regex": "temp", "$options": "i" }
  },
  "limits": {
    "limit": 10,
    "skip": 0
  }
}
```

---

## Initial Migration

The `MetadataKeys` collection is populated by a migration script that must be run manually before the service is deployed for the first time.

See: `migrations/20260417145401-sync-dataset-scientificMetadata-to-metadatakeys.js`

Documentation: `migrations/20260417145401-sync-dataset-scientificMetadata-to-metadatakeys.md`

> ⚠️ The application will start normally without the migration, but the MetadataKeys service will return empty results until it is run.
