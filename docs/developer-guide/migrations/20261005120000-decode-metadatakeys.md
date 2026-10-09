# 20261005120000 — Rebuild decoded Dataset metadata keys

This migration rebuilds Dataset rows in `MetadataKeys` directly from
`Dataset.scientificMetadata`, including nested fields. It works with an existing
top-level catalog or an empty catalog and requires no prior nesting migration.

Stored field names are decoded once with `decodeURIComponent` and joined with
dots. For example, `{ "group%20name": { "attribute%20name": { value: 1 } } }`
produces `group name.attribute name`. Malformed URI sequences are preserved.
Dots always separate nested groups; literal dots in field names are unsupported.

The migration descends into non-array objects unless they contain one or more
of `value`, `valueSI`, `unit`, `unitSI`, `v`, `u`, or `human_name`. These value
objects, primitive values, arrays, and `null` are cataloged as leaves.
`human_name` becomes `humanReadableName`, defaulting to an empty string.

Entries are aggregated by `(key, humanReadableName)`. The migration recalculates
`usageCount`, `userGroups`, `userGroupCounts`, and `isPublished` from the source
Datasets. After scanning, it deletes catalog rows with `sourceType: "Dataset"`
and inserts the rebuilt rows in batches of 1,000, with new UUIDs and timestamps.
Catalog rows for other source types and source documents are left unchanged.
Source metadata field names retain their storage encoding; catalog keys and
incoming conditions use decoded names.

Run `npm run migrate:db:up` with the database configured in
`migrate-mongo-config.js`. Deploy the backend changes together with this
migration so new catalog entries use the same decoded format.

Avoid concurrent Dataset metadata writes during the rebuild. Deletion and
insertion are not transactional, so catalog queries can briefly return partial
results. If execution fails after deletion, rerun the migration after resolving
the cause; it reconstructs the catalog from the source Datasets.

The down migration deletes documents with `sourceType: "Dataset"`. It does not restore the old top-level catalog. Running up again reconstructs the decoded nested catalog.
