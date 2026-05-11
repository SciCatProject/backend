# 20260417145401 — Sync Dataset scientificMetadata to MetadataKeys

## What this migration does

Rebuilds the `MetadataKeys` collection from scratch by scanning all `Dataset` documents and extracting every key found in `scientificMetadata`.

Each unique `(sourceType, key, humanReadableName)` combination becomes one `MetadataKey` document. If the same key appears across multiple datasets, their `userGroups` and counts are merged into a single entry.

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
  createdAt: ISODate("...")
}
```

---

## Migration Pipeline walkthrough

It builds a MetadataKeys collection by extracting and aggregating scientific metadata keys from datasets. Each document in MetadataKeys represents one unique metadata key, enriched with access group membership, usage counts, and publication status.

---

### Stage 1 — Flatten scientificMetadata into an array

```js
{
  $project: {
    datasetId: "$_id",
    ownerGroup: 1,
    accessGroups: 1,
    isPublished: 1,
    metaArr: { $objectToArray: "$scientificMetadata" },
  },
}
```

**What it does:** Converts the scientificMetadata object into an array of {k, v} pairs so it can be unwound in the next stage. Preserves \_id as datasetId for later use in usage counting.

**Input**

```js
{
  "_id": "ds1",
  "ownerGroup": "groupA",
  "accessGroups": ["groupB"],
  "isPublished": false,
  "scientificMetadata": {
    "temperature": { "human_name": "Temperature", "value": 100 },
    "pressure": { "human_name": "Pressure", "value": 200 }
  }
}
```

**Output**

```js
{
  "datasetId": "ds1",
  "ownerGroup": "groupA",
  "accessGroups": ["groupB"],
  "isPublished": false,
  "metaArr": [
    { "k": "temperature", "v": { "human_name": "Temperature", "value": 100 } },
    { "k": "pressure",    "v": { "human_name": "Pressure",    "value": 200 } }
  ]
}
```

---

### Stage 2 — One document per metadata key

```js
{
  $unwind: "$metaArr";
}
```

**What it does:** Produces one document per metadata key entry. A dataset with N metadata keys becomes N documents.

**Input (from stage1)**

```js
{
  "datasetId": "ds1",
  "metaArr": [
    { "k": "temperature", "v": { "human_name": "Temperature" } },
    { "k": "pressure",    "v": { "human_name": "Pressure" } }
  ]
}
```

**Output**

```js
{ "datasetId": "ds1", "metaArr": { "k": "temperature", "v": { "human_name": "Temperature" } } }
{ "datasetId": "ds1", "metaArr": { "k": "pressure",    "v": { "human_name": "Pressure" } } }
```

---

### Stage 3 — Shape each document (datasetId+key) with HRM and userGroups

```js
{
  $project: {
    datasetId: 1,
    key: "$metaArr.k",
    isPublished: 1,
    humanReadableName: { $ifNull: ["$metaArr.v.human_name", ""] },
    userGroups: {
      $setUnion: [["$ownerGroup"], { $ifNull: ["$accessGroups", []] }],
    },
  },
}
```

**What it does:** Extracts the key name and human-readable name. Computes userGroups as the union of ownerGroup and accessGroups — every group that has access to this dataset.

**Input (from stage2)**

```js
{
  "datasetId": "ds1",
  "ownerGroup": "groupA",
  "accessGroups": ["groupB"],
  "isPublished": false,
  "metaArr": { "k": "temperature", "v": { "human_name": "Temperature" } }
}
```

**output**

```js
{
  "datasetId": "ds1",
  "key": "temperature",
  "humanReadableName": "Temperature",
  "isPublished": false,
  "userGroups": ["groupA", "groupB"]
}
```

---

### Stage 4 — One document per (dataset+key+group)

```js
{
  $unwind: {
    path: "$userGroups",
  },
}
```

**What it does:** Split userGroups so each group gets its own document. This allows grouping by (key, group) in Stage 6.

**Input (from stage3)**

```js
{
  "datasetId": "ds1",
  "key": "temperature",
  "userGroups": ["groupA", "groupB"]
}
```

**output**

```js
{ "datasetId": "ds1", "key": "temperature", "userGroups": "groupA" }
{ "datasetId": "ds1", "key": "temperature", "userGroups": "groupB" }
```

---

### Stage 5 — Group by (metaKeyId, group)

```js
{
  $group: {
    _id: {
      metaKeyId: { $concat: [`${sourceType}_`, "$key", "_", "$humanReadableName"] },
      group: "$userGroups",
    },
    key: { $first: "$key" },
    humanReadableName: { $first: "$humanReadableName" },
    isPublished: { $max: "$isPublished" },
    groupCount: { $sum: 1 },
    datasetIds: { $addToSet: "$datasetId" },
  },
}
```

**What it does:** Groups by (metadata key, group) pair. Computes:

- `metaKeyId` is a stable, deterministic identifier derived from `${sourceType}_${key}_${humanReadableName}` used as the merge key in Stage 9 to prevent duplicate documents across pipeline runs.
- `groupCount` indicates how many datasets with this group use this key
- `datasetIds` includes distinct dataset IDs for this group, used later to count unique datasets across all groups without double-counting

**Input (from stage4)**

```js
{ "datasetId": "ds1", "key": "temperature", "humanReadableName": "Temperature", "userGroups": "groupA", "isPublished": false }
{ "datasetId": "ds2", "key": "temperature", "humanReadableName": "Temperature", "userGroups": "groupA", "isPublished": true }
{ "datasetId": "ds1", "key": "temperature", "humanReadableName": "Temperature", "userGroups": "groupB", "isPublished": false }
```

**Output**

```js
{
  "_id": { "metaKeyId": "dataset_temperature_Temperature", "group": "groupA" },
  "key": "temperature",
  "humanReadableName": "Temperature",
  "isPublished": true,
  "groupCount": 2,
  "datasetIds": ["ds1", "ds2"]
}
{
  "_id": { "metaKeyId": "dataset_temperature_Temperature", "group": "groupB" },
  "key": "temperature",
  "humanReadableName": "Temperature",
  "isPublished": false,
  "groupCount": 1,
  "datasetIds": ["ds1"]
}
```

---

### Stage 6 — Group by metaKeyId

```js
{
  $group: {
    _id: "$_id.metaKeyId",
    key: { $first: "$key" },
    humanReadableName: { $first: "$humanReadableName" },
    isPublished: { $max: "$isPublished" },
    userGroups: { $push: "$_id.group" },
    userGroupCountsArr: { $push: { k: "$_id.group", v: "$groupCount" } },
    datasetIdSets: { $push: "$datasetIds" },
  },
}
```

**What it does:** Reassembles one document per metadata key by collecting all per-group data. datasetIdSets is a list of per-group dataset ID sets — merged in Stage 8 to compute total unique dataset count.

**Input (from stage5)**

```js
{ "_id": { "metaKeyId": "dataset_temperature_Temperature", "group": "groupA" }, "groupCount": 2, "datasetIds": ["ds1", "ds2"] }
{ "_id": { "metaKeyId": "dataset_temperature_Temperature", "group": "groupB" }, "groupCount": 1, "datasetIds": ["ds1"] }
```

**Output**

```js
{
  "_id": "dataset_temperature_Temperature",
  "key": "temperature",
  "humanReadableName": "Temperature",
  "isPublished": true,
  "userGroups": ["groupA", "groupB"],
  "userGroupCountsArr": [
    { "k": "groupA", "v": 2 },
    { "k": "groupB", "v": 1 }
  ],
  "datasetIdSets": [["ds1", "ds2"], ["ds1"]]
}
```

---

### Stage 7 — Add generated UUID

```js
{
  $addFields: {
    metaKeyId: "$_id",
    generatedId: {
      $function: {
        body: "function() { return UUID().toString().replace('UUID(\"', '').replace('\")', ''); }",
        args: [],
        lang: "js",
      },
    },
  },
}
```

**What it does:** Saves `_id` which at this point is `${sourceType}_${key}_${humanReadableName}` as metaKeyId before it gets replaced. Generates a UUID for \_id to support future document splitting when a document approaches MongoDB's 16MB size limit, while metaKeyId remains the stable merge key for Stage 8.

**Input (from stage7)**

```json
{ "_id": "dataset_temperature_Temperature", ... }
```

**Output**

```json
{
  "_id": "dataset_temperature_Temperature",
  "metaKeyId": "dataset_temperature_Temperature",
  "generatedId": "550e8400-e29b-41d4-a716-446655440000",
  ...
}
```

---

### Stage 8 — Project final document shape

```js
{
  $project: {
    _id: "$generatedId",
    metaKeyId: 1,
    key: 1,
    sourceType: { $literal: sourceType },
    humanReadableName: 1,
    isPublished: 1,
    userGroups: 1,
    userGroupCounts: { $arrayToObject: "$userGroupCountsArr" },
    usageCount: {
      $size: {
        $reduce: {
          input: "$datasetIdSets",
          initialValue: [],
          in: { $setUnion: ["$$value", "$$this"] },
        },
      },
    },
    createdBy: { $literal: "migration" },
    createdAt: { $toDate: "$$NOW" },
  },
}
```

**What it does:** Produces the final document shape for MetadataKeys. Converts userGroupCountsArr to an object map. Computes usageCount by merging all per-group datasetIdSets into a single set and counting — this avoids double-counting datasets that belong to multiple groups.

**Why set union for usageCount:**

```js
datasetIds: ["ds1", "ds2"]; //groupA
datasetIds: ["ds1"]; // groupB
union: ["ds1", "ds2"]; // usageCount = 2  (not 3)
```

**Input (from stage7)**

```js
{
  "generatedId": "550e8400-e29b-41d4-a716-446655440000",
  "metaKeyId": "dataset_temperature_Temperature",
  "userGroupCountsArr": [{ "k": "groupA", "v": 2 }, { "k": "groupB", "v": 1 }],
  "datasetIdSets": [["ds1", "ds2"], ["ds1"]]
}
```

**Output**

```js
{
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "metaKeyId": "dataset_temperature_Temperature",
  "key": "temperature",
  "sourceType": "dataset",
  "humanReadableName": "Temperature",
  "isPublished": true,
  "userGroups": ["groupA", "groupB"],
  "userGroupCounts": { "groupA": 2, "groupB": 1 },
  "usageCount": 2,
  "createdBy": "migration",
  "createdAt": "2026-05-07T00:00:00.000Z"
}
```

---

### Stage 9 — Merge into MetadataKeys

```js
{
  $merge: {
    into: "MetadataKeys",
    on: "metaKeyId",
    whenMatched: [
      {
        $replaceWith: {
          $mergeObjects: [
            "$$new",
            { _id: "$_id" }
          ]
        }
      }
    ],
    whenNotMatched: "insert",
  },
}
```

**What it does:** Upserts each document into `MetadataKeys` using `metaKeyId` as the match key. On match, replaces the existing document entirely with the incoming one, preserving only `_id` since MongoDB does not allow changing it.

**Input (from Stage 9)**

```json
{
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "metaKeyId": "dataset_temperature_Temperature",
  "userGroups": ["groupA", "groupB"],
  "userGroupCounts": { "groupA": 2, "groupB": 1 },
  "usageCount": 2,
  "isPublished": true
}
```

**Output (inserted or replaced):**

```json
{
  "_id": "550e8400-e29b-41d4-a716-446655440000",
  "metaKeyId": "dataset_temperature_Temperature",
  "userGroups": ["groupA", "groupB"],
  "userGroupCounts": { "groupA": 2, "groupB": 1 },
  "usageCount": 2,
  "isPublished": true
}
```

## Running the migration

```bash
# Run manually in production — ideally during low-traffic hours.
# The migration is slow but non-blocking: the app continues to serve
# requests while it runs. However, MetadataKeys will be unavailable
# for the duration since the collection is wiped at the start.
npm run migrate:db:up

# verify
db.MetadataKeys.countDocuments({ userGroupCounts: { $exists: true } })
# should equal
db.MetadataKeys.countDocuments()
```

> ⚠️ **Do not interrupt.** The migration wipes `MetadataKeys` at the start with `deleteMany`. If interrupted, re-run `migrate:db:up` — the wipe ensures a clean slate on retry.

---

## Rollback

```bash
npm run migrate:db:down
```

Wipes the entire `MetadataKeys` collection. The collection will be repopulated on the next `migrate:db:up`.

Verify the rollback succeeded by checking the migration status:

```bash
npm run migrate:db:status
```

If the migration shows as `pending` it means the rollback was successful and the migration has not been run yet.
