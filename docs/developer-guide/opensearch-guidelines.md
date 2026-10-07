---
title: OpenSearch Integration
audience: Technical
created_by: Junjie Quan
created_on: 2026-03-17
updated_on: 2026-08-17
---

# OpenSearch Datasets V3 Integration

## Overview

SciCat includes an OpenSearch integration to support search functionality within the platform. The transition from Elasticsearch to OpenSearch was made following the Elasticsearch license change in order to maintain the use of fully open-source components in the project.

OpenSearch is used to resolve the **text portion** of a dataset query. All other filters, facets, and sorting continue to be executed using MongoDB queries: OpenSearch returns a list of matching dataset `pid`s, and MongoDB is then queried with `{ pid: { $in: [...] } }` plus the remaining filters.

Text search is no longer limited to `datasetName` and `description`. Documents are indexed with a catch-all field, `all_text`, which most dataset fields are copied into via `copy_to`, including a flattened text representation of `scientificMetadata`.

SciCat uses the official OpenSearch JavaScript client `@opensearch-project/opensearch@^3.5.1` for indexing, synchronization, and search operations. This version is compatible with OpenSearch v3.5.0.

> **The index configuration is not free-form.** The query builder targets specific field names, so a custom `opensearchConfig.json` that omits or renames them will not raise an error — searches will simply return nothing. See [Required mappings](#required-mappings) before writing your own configuration.

## Getting Started

To start the application with OpenSearch:

1. Run `npm run prepare:local` to start the OpenSearch cluster as a Docker container.
2. Set `OPENSEARCH_ENABLED=yes` and provide values for all required environment variables: `OPENSEARCH_HOST`, `OPENSEARCH_USERNAME`, and `OPENSEARCH_PASSWORD`.
   > **Note:** `OPENSEARCH_PASSWORD` must match `OPENSEARCH_INITIAL_ADMIN_PASSWORD` set when creating the OpenSearch container.
3. Start the application with `npm run start`. On successful connection you will see:

```
   [Nest] 80126  - 03/17/2026, 3:09:41 PM     LOG [Opensearch] Opensearch Connected
```

**Note:** On startup the service checks whether the default index exists and creates it automatically if it does not, using the configured settings and mappings. Connection is retried up to 10 times with exponential backoff (5s up to a 60s cap). If all attempts fail, the application continues to run without OpenSearch and falls back to MongoDB text search.

4. Open the Swagger page at `http://localhost:3000/explorer` and authorize with an `admin` token.
5. Execute `POST /opensearch/create-index` to create the index.
   > **Note:** This step can be skipped if you want to use the default index `dataset`.
6. Execute `POST /opensearch/sync-database` to sync data from MongoDB into OpenSearch. On success you will see:

```json
{
  "total": 21670,
  "failed": 0,
  "retry": 0,
  "successful": 21670,
  "noop": 0,
  "time": 4777,
  "bytes": 279159021,
  "aborted": false
}
```

## Environment Configuration

OpenSearch behavior is controlled using environment variables.
To enable OpenSearch, set `OPENSEARCH_ENABLED=yes` and provide values for all required environment variables: `OPENSEARCH_HOST`, `OPENSEARCH_USERNAME`, and `OPENSEARCH_PASSWORD`.

| Variable                          | Example                  | Description                                                                                                                                                                                                             | Required |
| --------------------------------- | ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `OPENSEARCH_ENABLED`              | `"yes" \| "no"`          | Controls whether OpenSearch is enabled on application startup. If not provided or set to `no`, OpenSearch will not be instantiated.                                                                                     | Yes      |
| `OPENSEARCH_DEFAULT_INDEX`        | `dataset`                | Specifies the default index. If not provided, a default index named `dataset` will be created automatically.                                                                                                            | No       |
| `OPENSEARCH_HOST`                 | `https://localhost:9200` | Specifies the OpenSearch server endpoint.                                                                                                                                                                               | Yes      |
| `OPENSEARCH_USERNAME`             | `"admin"`                | Username for OpenSearch authentication. Defaults to `admin` in standard deployments but can be configured to use a custom user with appropriate permissions.                                                            | Yes      |
| `OPENSEARCH_PASSWORD`             | `Scicat-password2026`    | Password used for OpenSearch authentication. Must match `OPENSEARCH_INITIAL_ADMIN_PASSWORD` used when creating the OpenSearch container.                                                                                | Yes      |
| `OPENSEARCH_REFRESH`              | `"wait_for" \| "false"`  | Controls index refresh behavior. `wait_for` waits for the next refresh cycle before returning, which is useful for development and testing. `false` skips waiting and is recommended for production. Defaults to false. | No       |
| `OPENSEARCH_DATA_SYNC_BATCH_SIZE` | 1000                     | Number of documents fetched from MongoDB per batch during OpenSearch data sync. Defaults to 10000                                                                                                                       | No       |

## Index Configuration

OpenSearch index settings and mappings can be customized using a configuration file.

An optional `opensearchConfig.json` file can be mounted to `/home/node/app/opensearchConfig.json` in the container (or placed in the project root when running locally) to define custom index settings and mappings.

If not provided, a default configuration will be loaded from `opensearchConfig.example.json` in the root.

For full configuration options, see:
https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index/

### Required mappings

> **Important:** the query builder targets specific field names. A custom `opensearchConfig.json` is not free-form — if it omits any of the fields below, queries will not error, they will silently return **no results**. This is easy to miss, because index creation and sync both succeed.

The contract between `opensearchConfig.json` and `SearchQueryService` is:

| Field           | Required mapping                                                         | Used by                                                                 |
| --------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------- |
| `all_text`      | `text`, with an analyzer for indexing and a search analyzer for querying | `fast` mode — `simple_query_string` targets this field and nothing else |
| `all_text.wild` | sub-field of type `wildcard`                                             | `wildcard` fallback mode — `wildcard` query on `all_text.wild`          |
| `isPublished`   | `boolean`                                                                | access filter — `term` clause                                           |
| `ownerGroup`    | `keyword`                                                                | access filter — `terms` clause                                          |
| `accessGroups`  | `keyword`                                                                | access filter — `terms` clause                                          |

Everything else in the mapping is discretionary: which dataset fields you declare, and which of them you give `copy_to: "all_text"`, determines what is searchable. A field that is declared but has no `copy_to` is stored and filterable but will not match a text query. A field that is not declared at all is ignored entirely, because the mapping sets `dynamic: false`.

The analyzers referenced by `all_text` must also be defined under `settings.analysis`. In the shipped example these are `autocomplete` (an `edge_ngram` tokenizer, 2–64 characters, with a `word_delimiter_graph` filter) for indexing and `autocomplete_search` (a `keyword` tokenizer with `lowercase`) for querying. You can substitute your own analyzers, but the index-time and search-time pair must be chosen together — using the edge n-gram analyzer at search time as well would tokenize the query into prefixes and produce very broad matches.

One further coupling: search runs with `_source: false` and returns OpenSearch document ids, which the datasets service then feeds into a MongoDB `{ pid: { $in: [...] } }` lookup. The document id must therefore be the dataset `pid`. Sync indexes each document under its MongoDB `_id`, and single-document upserts index under `data.pid`; these agree only because a dataset's `_id` is its `pid`. If that ever stops holding, both indexing paths need revisiting.

### Changing the configuration

Mappings cannot be modified on a live index. To change them: create a new index with `POST /opensearch/create-index`, sync into it, then point `OPENSEARCH_DEFAULT_INDEX` at it. Settings can be updated in place with `POST /opensearch/update-index`, which closes, updates, and reopens the index — the index is unavailable for the duration.

### Default mapping

The default mapping uses `dynamic: false`, so only explicitly declared fields are indexed.

The central field is `all_text`, a `text` field using the `autocomplete` analyzer (edge n-gram, 2–64 characters) for indexing and the `autocomplete_search` analyzer at query time. It also has a `wild` sub-field of type `wildcard`, used by the wildcard fallback search mode described below.

Fields are made searchable by declaring them as `keyword`, `date`, or `long` and adding `copy_to: "all_text"`. Currently copied into `all_text`:

`pid`, `owner`, `ownerEmail`, `contactEmail`, `sourceFolder`, `type`, `keywords`, `description`, `datasetName`, `classification`, `version`, `createdBy`, `updatedBy`, `creationLocation`, `proposalIds`, `instrumentIds`, `sampleIds`, `techniques.pid`, `techniques.name`, `principalInvestigators`, `creationTime`, `createdAt`, `updatedAt`, `numberOfFiles`, `runNumber`, `size`, `datasetlifecycle.archiveStatusMessage`, `datasetlifecycle.retrieveStatusMessage`, and `scientificMetadataText`.

`isPublished`, `ownerGroup`, and `accessGroups` are indexed for authorization filtering only and are deliberately **not** copied into `all_text`.

`scientificMetadata` is mapped as `{ "type": "object", "enabled": false }`, meaning it is stored but not indexed. Its searchable form is `scientificMetadataText`, described below.

### Scientific metadata flattening

Because `scientificMetadata` is free-form and can be arbitrarily nested, it cannot be mapped directly without risking mapping explosion. During indexing, `flattenScientificMetadata()` (`src/opensearch/utils/opensearch.util.ts`) walks the object and produces a flat list of text values:

- **Keys at every level are included**, so a metadata name is searchable whether it sits at the top or several levels down. Users nest freely, and `{ instrument: { detector: { model: "X" } } }` has meaningful names at all three levels.
- Leaf values at any depth are included.
- Booleans and `null`/`undefined` are ignored; arrays are flattened without counting as a level.
- Results are collected in a `Set`, so repeated keys and values are stored once. This matters on datasets with many similar measurements, where structural keys such as `value` and `unit` would otherwise repeat hundreds of times.
- The joined text is split into 20,000-character chunks with a 200-character overlap, to stay within field length limits without cutting terms at chunk boundaries.
  The result is written to `scientificMetadataText`, which is mapped with `index: false` and `copy_to: "all_text"` — the text is searchable through `all_text` but is not separately indexed.

One consequence worth knowing: structural keys are now searchable terms, so a bare search for `unit` matches every dataset that has one. With `default_operator: "and"` this rarely affects real multi-term queries.

Both indexing paths build the document through the same helper, `toOpensearchDocument()`, so a dataset created or updated through the API is searchable on its metadata immediately, without waiting for a re-sync.

### Fields synced to OpenSearch

The set of dataset fields sent to OpenSearch is defined once in `DATASET_OPENSEARCH_FIELDS` (`src/opensearch/utils/dataset-opensearch.utils.ts`). It drives two things:

- `DATASET_OPENSEARCH_PROJECTION`, the MongoDB projection used during sync.
- `DatasetOpenSearchDto`, which is `PickType(OutputDatasetDto, DATASET_OPENSEARCH_FIELDS)` and is used for single-document upserts.
  To index a new field, add it to `DATASET_OPENSEARCH_FIELDS` **and** to the index mappings, then re-run the sync.

### Result window

`max_result_window` in the index settings caps how many results OpenSearch will return, and defaults to `10000`. The service reads this value at startup and uses it to clamp requests:

- `size` is `min(limit, max_result_window - skip)`
- `track_total_hits` is set to `max_result_window`, so `totalCount` saturates at that value rather than being exact for very large result sets.
  Raising this limit increases memory pressure on the cluster; prefer narrowing queries over raising the window.

## Query Logic

Search is invoked internally by the datasets service (`opensearchQuery` and `opensearchFacet`), not through a dedicated public search endpoint. OpenSearch is used only when all of the following hold:

1. `OPENSEARCH_ENABLED=yes`
2. The request includes a `text` field
3. The client is connected
4. The target index is non-empty

If any check fails, the request falls back to the existing MongoDB `fullquery` / `fullFacet` path.

### Text search

Text matching runs in two modes, defined in `SearchQueryService` (`src/opensearch/providers/query-builder.service.ts`):

| Mode       | Query                                                                             | Purpose                                                                                |
| ---------- | --------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `fast`     | `simple_query_string` on `all_text`, `default_operator: and`, `flags: WHITESPACE` | Analyzed token lookup. Fast, and handles prefix matching via the edge n-gram analyzer. |
| `wildcard` | `wildcard` on `all_text.wild`, case-insensitive, pattern `*<query>*`              | Pattern scan that matches fragments in the middle of a token. Slower.                  |

The service always tries `fast` first and only falls back to `wildcard` when `fast` returns zero hits. Wildcard special characters (`*`, `?`, `\`) in the user's input are escaped before the pattern is built.

An empty or whitespace-only query yields `match_all` rather than an error, so access filters alone determine the result set.

### Access filtering

The filter fields are set by the controller before the service is reached, based on CASL abilities:

| Caller                        | Fields set                                  | Resulting filter                             |
| ----------------------------- | ------------------------------------------- | -------------------------------------------- |
| Anonymous (no user)           | `isPublished: true`                         | published datasets only                      |
| Authenticated, no `AccessAny` | `userGroups` from the user's current groups | datasets owned by / shared with those groups |
| `AccessAny` (admin)           | neither                                     | no access filter                             |

The filter itself is then built as a `filter` clause alongside the text query:

1. If neither `userGroups` nor `isPublished` is present — only possible for `AccessAny` — no access filter is applied. Queries run against the full index, which may be slower.
2. Otherwise a `bool.should` clause with `minimum_should_match: 1` is built.
3. `{ term: { isPublished: true } }` is added only when the request actually carries `isPublished`.
4. When `userGroups` is present, `terms` clauses on `ownerGroup` and `accessGroups` are added.

## Data Synchronization

`syncDatasetsToOpensearch()` streams datasets rather than loading them into memory:

1. A MongoDB cursor is opened with `.lean()` and the OpenSearch field projection, using `OPENSEARCH_DATA_SYNC_BATCH_SIZE` as the cursor batch size.
2. Documents are piped into the OpenSearch client's bulk helper (`flushBytes: 5 MB`, `concurrency: 5`, `retries: 5`, `wait: 10s`).
3. Each document's Mongo `_id` is used as the OpenSearch document `_id` and removed from the body — `_id` is a reserved metadata field and cannot appear inside a document.
4. `scientificMetadata` is flattened into `scientificMetadataText` by `toOpensearchDocument()`, the same helper used for single-document upserts.
5. Progress is logged every 10,000 documents.
6. Dropped documents are grouped by failure reason and logged together with a sample of failing ids, rather than one log line per failure.
7. The cursor is closed in a `finally` block.

Single-document upserts and deletes happen inline on dataset create, update, patch, and delete. These go through `toOpensearchDocument()` as well, so an inline upsert and a bulk sync produce the same document. If you add a derived field, add it there and both paths pick it up.

## API Endpoints

All OpenSearch endpoints are restricted to admin users (`Action.Manage` on the `Opensearch` subject).

> **Changed:** `POST /opensearch/search` has been removed. Text search is reached through the normal dataset query endpoints, which delegate to OpenSearch internally when it is enabled.

### Create Index

**POST** `/opensearch/create-index`

- `index` (body, required): Target index name. Default: `dataset`
- `settings` (body, optional): Index settings. Falls back to `opensearchConfig.json`.
- `mappings` (body, optional): Index mappings. Falls back to `opensearchConfig.json`.

Swagger shows realistic examples for both fields, sourced from `opensearchIndexMappingsExample` and `opensearchIndexSettingsExample` in `src/common/utils.ts`.

---

### Sync Database

**POST** `/opensearch/sync-database`

Synchronizes datasets from MongoDB to OpenSearch. Only the dataset collection is supported.

- `index` (query, optional): Index name. Default: `dataset`
  Returns the bulk statistics object shown in Getting Started. Fails with `Index <name> not found` if the index does not exist.

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

**POST** `/opensearch/update-index`

Updates index settings. Closes the index, applies the new settings, then reopens it. Mappings cannot be changed this way — changing mappings requires creating a new index and re-syncing.

- `index` (body, required): Target index name. Default: `dataset`
- `settings` (body, optional): Index settings to apply. Falls back to `opensearchConfig.json`.

---

If you encounter performance issues related to OpenSearch, please open a [GitHub issue](https://github.com/SciCatProject/backend/issues) or report them at the SciCat meeting.
