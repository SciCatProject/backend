---
title: OpenSearch Integration
audience: Technical
created_by: Junjie Quan
created_on: 2026-03-17
---

# OpenSearch Integration

## Overview

SciCat now includes an OpenSearch integration to support search functionality within the platform. The transition from Elasticsearch to OpenSearch was made following the Elasticsearch license change in order to maintain the use of fully open-source components in the project.

The current OpenSearch integration supports partial text search for datasets.

Text search currently targets only the following fields:

- `datasetName`
- `description`

All other filters and queries continue to be executed using MongoDB queries.

SciCat uses the official OpenSearch JavaScript client `@opensearch-project/opensearch@^3.5.1` for indexing, synchronization, and search operations. This version is compatible with OpenSearch v3.5.0.

To be able to start application with OpenSearch you will need to:

## Getting Started

To start the application with OpenSearch:

1. Run `npm run prepare:local` to start the OpenSearch cluster as a Docker container.
2. Set `OPENSEARCH_ENABLED=yes` and provide values for all required environment variables: `OPENSEARCH_HOST`, `OPENSEARCH_USERNAME`, and `OPENSEARCH_PASSWORD`.
   > **Note:** `OPENSEARCH_PASSWORD` must match `OPENSEARCH_INITIAL_ADMIN_PASSWORD` set when creating the OpenSearch container.
3. Start the application with `npm run start`. On successful connection you will see:

```
   [Nest] 80126  - 03/17/2026, 3:09:41 PM     LOG [Opensearch] Opensearch Connected
```

## Environment Configuration

OpenSearch behavior is controlled using environment variables.
To enable OpenSearch, set `OPENSEARCH_ENABLED=yes` and provide values for all required environment variables: `OPENSEARCH_HOST`, `OPENSEARCH_USERNAME`, and `OPENSEARCH_PASSWORD`.

| Variable                   | Example                  | Description                                                                                                                                                                                                             | Required |
| -------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `OPENSEARCH_ENABLED`       | `"yes" \| "no"`          | Controls whether OpenSearch is enabled on application startup. If not provided or set to `no`, OpenSearch will not be instantiated.                                                                                     | Yes      |
| `OPENSEARCH_DEFAULT_INDEX` | `dataset`                | Specifies the default index. If not provided, a default index named `dataset` will be created automatically.                                                                                                            | No       |
| `OPENSEARCH_HOST`          | `https://localhost:9200` | Specifies the OpenSearch server endpoint.                                                                                                                                                                               | Yes      |
| `OPENSEARCH_USERNAME`      | `"admin"`                | Username for OpenSearch authentication. Defaults to `admin` in standard deployments but can be configured to use a custom user with appropriate permissions.                                                            | Yes      |
| `OPENSEARCH_PASSWORD`      | `Scicat-password2026`    | Password used for OpenSearch authentication. Must match `OPENSEARCH_INITIAL_ADMIN_PASSWORD` used when creating the OpenSearch container.                                                                                | Yes      |
| `OPENSEARCH_REFRESH`       | `"wait_for" \| "false"`  | Controls index refresh behavior. `wait_for` waits for the next refresh cycle before returning, which is useful for development and testing. `false` skips waiting and is recommended for production. Defaults to false. | No       |

## Index Configuration

OpenSearch index settings and mappings can be customized using a configuration file.

An optional `opensearchConfig.json` file can be mounted to `/home/node/app/opensearchConfig.json` in the container (or placed in the project root when running locally) to define custom index settings and mappings.

If not provided, a default configuration will be loaded from `opensearchConfig.example.json` in the root, supporting partial text search on `datasetName` and `description`.

For full configuration options, see:
https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index/

## Query Logic

Search queries follow the process below.

### Access Filtering

Before performing text search, results are filtered based on user access permissions:

1. If the user belongs to one or more `userGroups`, these are applied as access filters.
2. If the user has no groups and is not an admin, the `isPublished` filter is applied.
3. Admin users bypass group-based access filters, which means queries are executed against a larger dataset. This is a known limitation and may result in slower response times for admin search requests.

### Text Search

After access filtering, OpenSearch performs a partial text search on the following fields:

- `datasetName`
- `description`

These fields are currently hardcoded in the `MustFields` enum (`src/opensearch/providers/fields.enum.ts`) and are not configurable.

## API Endpoints

All OpenSearch endpoints are restricted to admin users.

### Create Index

**POST** `/opensearch/create-index`

- `index` (body, required): Target index name. default: `dataset`
- `settings` (body, optional): Index settings to apply. If not provided, defaults from `opensearchConfig.json` are used.

---

### Sync Database

**POST** `/opensearch/sync-database`

Synchronizes datasets from MongoDB to OpenSearch.

- `index` (query, optional): Index name. default: `dataset`

---

### Search

**POST** `/opensearch/search`

Performs partial text search on datasets.

- `textQuery` (query): Search text (applies to `datasetName` and `description`)
- `index` (query, optional): Target index name. default: `dataset`
- `limit` (query, optional): Max results
- `skip` (query, optional): Offset

Returns matching dataset `_id`s.

---

### Delete Index

**POST** `/opensearch/delete-index`

Deletes an index.

- `index` (query): Target index name.

---

### Get Index Configuration

**GET** `/opensearch/get-index`

Retrieves index settings and mappings.

- `index` (query): Target index name. default: `dataset`

---

### Update Index Settings

**POST** `/opensearch/update-index`

Updates index settings. Closes the index, applies the new settings, then reopens it.

- `index` (body, required): Target index name. default: `dataset`
- `settings` (body, optional): Index settings to apply. If not provided, defaults from `opensearchConfig.json` are used.

---

If you encounter performance issues related to OpenSearch, please open a [GitHub issue](https://github.com/SciCatProject/backend/issues) or report them at the SciCat meeting.
