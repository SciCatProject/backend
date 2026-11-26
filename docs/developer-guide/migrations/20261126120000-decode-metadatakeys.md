# 20261126120000 — Rebuild decoded Dataset metadata keys

This migration rebuilds Dataset rows in `MetadataKeys` directly from `Dataset.scientificMetadata`, including nested fields.

Stored field names are decoded once with `decodeURIComponent` and joined with dots.
For example, `{ "group%20name": { "attribute%20name": { value: 1 } } }` produces `group name.attribute name`.
Dots always separate nested groups; literal dots in field names are unsupported.

The migration descends into non-array objects unless they contain one or more of `value`, `valueSI`, `unit`, `unitSI`, `v`, `u`, or `human_name`.
These value objects, primitive values, arrays, and `null` are cataloged as leaves.
String values of `human_name` become `humanReadableName`, which defaults to an empty string.

Entries are aggregated by `(key, humanReadableName)`.
The migration recalculates `usageCount`, `userGroups`, `userGroupCounts`, and `isPublished` from the source Datasets.
It deletes the existing Dataset catalog rows, then writes and clears its running totals every 10,000 Datasets or when a batch reaches 10,000 distinct entries.
Bulk upserts merge counts and group membership for entries seen in multiple batches.
Source metadata field names retain their storage encoding; catalog keys and incoming conditions use decoded names.

Run `npm run migrate:db:up` with the database configured in `migrate-mongo-config.js`.
Deploy the backend changes together with this migration so new catalog entries use the same decoded format.
