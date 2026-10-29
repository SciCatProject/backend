# 20260420145401 — Sync Dataset scientificMetadata to MetadataKeys

## What this migration does

Rebuilds the `Dataset` entries of the `MetadataKeys` collection by scanning all `Dataset` documents and extracting every key found in `scientificMetadata`.

Each unique `(sourceType, key, humanReadableName)` combination becomes one `MetadataKey` document. If the same key appears across multiple datasets, their `userGroups` and counts are merged into a single entry.

Keys of the other source types (`Proposal`, `Sample`, `Instrument`) are not rebuilt here, and their current entries are left untouched.

---

## Why it exists

The `MetadataKeys` collection powers metadata key search and access control. This is the initial population of the collection — it must be run once before the service can operate.

Each `MetadataKey` document tracks:

- `userGroupCounts: Map<string, number>` — how many datasets per group reference this key, enabling safe atomic group removal when a dataset is updated or deleted
- `usageCount: number` — total datasets referencing this key regardless of groups, used as the authoritative deletion signal

---

## Source data shape

```js
// Dataset document
{
  ...,
  _id: "uuid-A",
  ownerGroup: "group-1",       // mandatory
  accessGroups: ["group-2"],   // optional
  isPublished: true,
  scientificMetadata: {
    temperature: { value: 100, unit: "C", human_name: "Temperature" },
    pressure:    { value: 1,   unit: "bar" },   // no human_name
  }
}
```

---

## MetadataKey shape

```js
// MetadataKey document
{
  _id: "550e8400-e29b-41d4-a716-446655440000",
  id:"550e8400-e29b-41d4-a716-446655440000",
  key: "temperature",
  humanReadableName: "Temperature",
  sourceType: "Dataset",
  isPublished: true,
  usageCount: 2,
  userGroups: ["group-1", "group-2"],
  userGroupCounts: { "group-1": 2, "group-2": 1 },
  createdBy: "migration",
  updatedBy: "migration",
  createdAt: ISODate("..."),
  updatedAt: ISODate("...")
}
```

---

## How it works

The migration reads datasets in batches, adds up the counts per key in Node, and writes each batch with one `bulkWrite` of upserts. The upserts use the same filter and update operators as `MetadataKeysService.upsertMany`, so the result matches what the app would have built by creating every dataset through the API.

It reuses `createMetadataKeysInstance` and `decodeURIComponentExtended` from `dist/common/utils`, so `dist/` must be built before it runs.

### Step 1 — Check group names

Every `ownerGroup` and `accessGroups` value is checked before anything is deleted. Group names become `userGroupCounts.<group>` update paths (as in the app), so a name containing `.` would be stored as a nested field and a name starting with `$` would be rejected by MongoDB.

If such names exist, the migration stops with an error listing them and leaves `MetadataKeys` untouched:

```
Dataset has groups that cannot be used as MetadataKeys userGroupCounts keys: team.alpha, $weird
```

### Step 2 — Clear the entries being rebuilt

```js
deleteMany({
  $or: [{ sourceType: { $in: ["Dataset"] } }, { sourceId: { $exists: true } }],
});
```

Deletes the `Dataset` keys, which are rebuilt below, and the obsolete one-entry-per-source documents of the previous schema (identified by `sourceId`), whatever their source type. Current keys of the other source types are kept.

### Step 3 — Prepare indexes

- Drops `metaKeyId_1` if it exists. A failed run of the previous version of this migration could leave this unique index behind, and it would reject every key after the first.
- Creates `{ sourceType: 1, key: 1 }` (the same index as the app schema), so each upsert finds its key through an index.

### Step 4 — Add up the counts per key, in batches of 10,000 datasets

Each dataset is passed through `createMetadataKeysInstance`, the same function the app uses. It returns the dataset's `userGroups` (`ownerGroup` plus `accessGroups`, deduplicated, empty values dropped), `isPublished` and `metadata`. Then for every metadata key:

- the key is decoded with `decodeURIComponentExtended` (keys are URL-encoded in `scientificMetadata` to satisfy Mongo field-name rules; if decoding fails the key is kept as it is),
- `humanReadableName` is `human_name` when it is a string, otherwise `""`,
- the totals for `(key, humanReadableName)` are updated: `usageCount + 1`, `isPublished` OR-ed, and `userGroupCounts[group] + 1` for each of the dataset's groups.

**Input (one batch)**

```js
{ "_id": "ds1", "ownerGroup": "groupA", "accessGroups": ["groupB"], "isPublished": false,
  "scientificMetadata": { "temperature": { "human_name": "Temperature" }, "pressure": {} } }
{ "_id": "ds2", "ownerGroup": "groupA", "isPublished": true,
  "scientificMetadata": { "temperature": { "human_name": "Temperature" } } }
```

**Batch totals**

```js
["temperature", "Temperature"] → { usageCount: 2, isPublished: true,  userGroupCounts: { groupA: 2, groupB: 1 } }
["pressure", ""]               → { usageCount: 1, isPublished: false, userGroupCounts: { groupA: 1, groupB: 1 } }
```

### Step 5 — Upsert the batch

After every 10,000 datasets (and once at the end), each key in the batch totals becomes one upsert:

```js
{
  updateOne: {
    filter: { sourceType: "Dataset", key: "temperature", humanReadableName: "Temperature" },
    update: {
      $set: { updatedAt: now },
      $inc: { usageCount: 2, "userGroupCounts.groupA": 2, "userGroupCounts.groupB": 1 },
      $max: { isPublished: true },
      $addToSet: { userGroups: { $each: ["groupA", "groupB"] } },
      $setOnInsert: { _id: uuid, id: uuid, createdBy: "migration", updatedBy: "migration", createdAt: now },
    },
    upsert: true,
  },
}
```

Because the counts are applied with `$inc`, a key that appears in several batches adds up across them; no batch overwrites another. Batches never share a dataset, so adding the per-batch counts gives the correct totals. `now` is taken once per batch; `createdAt` keeps the time of the batch that first inserted the key.

---

## Running the migration

```bash
# The migration does not block the app: it keeps serving requests while
# this runs. However, the Dataset keys are cleared at the start and rebuilt
# batch by batch, so until it finishes searches see only part of the keys,
# and datasets created, updated or deleted during the run can leave
# inconsistent counts and userGroups. For consistent results, stop the API
# or at least ingestion while it runs, ideally during low-traffic hours.

# dist/ must be built first (it already is in the Docker image)
npm run build
npm run migrate:db:up
# or, locally, build and migrate in one step
npm run migrate:db:up:dev

# verify
db.MetadataKeys.countDocuments({ sourceType: "Dataset", userGroupCounts: { $exists: true } })
# should equal
db.MetadataKeys.countDocuments({ sourceType: "Dataset" })
```

> ⚠️ **If it fails or is interrupted**, migrate-mongo does not record it as applied. Re-run `migrate:db:up`: the migration clears the `Dataset` keys again and rebuilds them, so a rerun gives the same result as a single successful run.

---

## Rollback

```bash
npm run migrate:db:down
```

Wipes the entire `MetadataKeys` collection, including keys of the other source types. The `Dataset` keys will be repopulated on the next `migrate:db:up`.

Verify the rollback succeeded by checking the migration status:

```bash
npm run migrate:db:status
```

If the migration shows as `pending` it means the rollback was successful and the migration has not been run yet.
