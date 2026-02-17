---
title: Runtime Configuration System Overview
audience: Technical
created_by: Junjie Quan
created_on: 2026-01-08
---

# Runtime Configuration: Technical Documentation

## Overview

SciCat frontend supports runtime-editable configuration stored in the backend and fetched dynamically at application startup.

Configuration is identified by a configuration ID (cid) and accessed via the runtime-config API.

## Predefined Configuration IDs

```json
CONFIG_SYNC_TO_DB_LIST="frontendConfig, frontendTheme"
```

- When provided, it is parsed as a comma-separated list of configuration IDs.
- When not provided, the system always includes the following defaults: - frontendConfig - frontendTheme
  These default configuration IDs are always synchronized to ensure frontend functionality.

### Runtime Config API

- `GET /api/v3/runtime-config/:id`  
  Retrieves the current runtime configuration by `cid`. Response includes: `cid`, `data`, `updatedBy`

- `PUT /api/v3/runtime-config/:id`  
  Updates the runtime configuration and persists changes to the database. This endpoint accepts only the data object in the request body and `updatedBy` is automatically set from the user name.

## Backend Synchronization Flow

On backend startup:

1. `CONFIG_SYNC_TO_DB_LIST` is read from environment variables.
2. For each configuration ID:
   - If no record exists in the database, a new record is created from the corresponding config file.
   - If a record already exists, it is overwritten with values from the config file.
3. After initialization, all changes are managed via the `runtime-config` API.

## Extensibility

The system is designed to support additional runtime configurations in the future.

For any new configuration to be editable via the UI:

1. The configuration ID must be included in CONFIG_SYNC_TO_DB_LIST
2. A corresponding JSONForms Schema & UI Schema must be provided
3. The schema files must be created in the frontend

Without schema support, configuration values may exist in the database but will not be editable via the UI.
