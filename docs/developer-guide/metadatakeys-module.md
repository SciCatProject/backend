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

## Module Architecture

This module consists of a dedicated Controller and Service layer that implements a robust permission-aware logic.

### MetadataKeysController

Provides the API interface for searching keys. Allowed filters can be found in `src/metadata-keys/metadatakeys.service.ts` and exmaple can be find in `src/metadata-keys/types/metadatakeys-filter-content.ts`

- `Endpoint`: GET /metadatakeys (replaces /datasets/metadataKeys)
- `Method`: findAll
- `Endpoint Access`: Endpoint can be Accessed by any users

### MetadataKeysService

This handles the business logic and talks to the database. It is divided into user-facing search logic and internal data synchronization.

#### Permission Layer (Applies to findAll only):

When a user searches for keys, the service uses accessibleBy to automatically append access filters based on CASL permissions:

- `Admins`: Can search and get all metadata keys in the system.
- `Authenticated Users`: Can only get keys where they are part of the ownerGroup or accessGroups.
- `Unauthenticated Users`: Can only get keys that are marked as isPublished.

#### Service Methods:

- `findAll`: The only public-facing method. It applies the permission layer and then uses a database aggregation pipeline to find and return the specific keys requested by the user. Every search is limited to 100 results by default, if limit is not provided.
- `insertManyFromSource`: An internal method that takes an original document (like a Dataset), extracts fields from **scientificMetadata**, **metadata**, and **customMetadata**, and creates new records in the Metadata Keys collection.
- `deleteMany`: Removes metadata key entries associated with a source document when that document is deleted from the system.
- `replaceManyFromSource`: Triggered when a source document (e.g., a Dataset or Proposal) is updated. It calls `deleteMany` and `insertManyFromSource` sequentially.

## Usage Example

To list all metadata keys associated with a dataset, the user must provide the sourceType and sourceId. If the fields array is provided, only those specific fields will be returned:

```json
{
  "where": {
    "sourceType": "dataset",
    "sourceId": "datasetId"
  },
  "fields": ["humanreadableName", "key"],
  "limits": {
    "limit": 10,
    "skip": 0,
    "sort": {
      "createdAt": "asc | desc"
    }
  }
}
```

To retrieve a specific metadata key, use the following filter:

```json
{
  "where": {
    "sourceType": "dataset",
    "sourceId": "datasetId",
    "key": "metadata_key_name"
  },
  "fields": ["key"],
  "limits": {
    "limit": 10,
    "skip": 0,
    "sort": {
      "createdAt": "asc | desc"
    }
  }
}
```
