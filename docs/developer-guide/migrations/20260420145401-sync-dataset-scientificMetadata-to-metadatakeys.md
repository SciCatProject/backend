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

## Output shape

```js
// MetadataKey document
{
  _id: "Dataset_temperature_Temperature",  // ${sourceType}_${key}_${humanReadableName}
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

The migration pipeline uses two datasets as a running example throughout:

|           | ownerGroup | accessGroups | isPublished | scientificMetadata keys |
| --------- | ---------- | ------------ | ----------- | ----------------------- |
| Dataset A | group-1    | [group-2]    | true        | temperature, pressure   |
| Dataset B | group-1    | []           | false       | temperature             |

---

### Stage 1 — Flatten scientificMetadata

Expose `_id` as `datasetId` and convert `scientificMetadata` from an object to an array of `{k, v}` pairs using `$objectToArray`.

```js
// Input
{
  _id: "uuid-A",
  ownerGroup: "group-1",
  accessGroups: ["group-2"],
  isPublished: true,
  scientificMetadata: {
    temperature: { value: 100, unit: "C", human_name: "Temperature" },
    pressure:    { value: 1, unit: "bar" },
  }
}

// Output
{
  datasetId: "uuid-A",
  ownerGroup: "group-1",
  accessGroups: ["group-2"],
  isPublished: true,
  metaArr: [
    { k: "temperature", v: { value: 100, unit: "C", human_name: "Temperature" } },
    { k: "pressure",    v: { value: 1, unit: "bar" } },
  ]
}
```

---

### Stage 2 — Unwind metaArr

One document per `(dataset, metadata key)`.

```
Input:  1 document (Dataset A) with metaArr of length 2
Output: 2 documents

{ datasetId: "uuid-A", ..., metaArr: { k: "temperature", v: { human_name: "Temperature", ... } } }
{ datasetId: "uuid-A", ..., metaArr: { k: "pressure",    v: { ... } } }
```

---

### Stage 3 — Shape each (dataset, key) document

Extract `key`, `humanReadableName`, and compute `userGroups` as the union of `ownerGroup` and `accessGroups`.

```js
// Input (one of the two documents from stage 3)
{ datasetId: "uuid-A", ownerGroup: "group-1", accessGroups: ["group-2"], isPublished: true, metaArr: { k: "temperature", v: { human_name: "Temperature" } } }

// Output (all documents after both datasets are processed)
{ datasetId: "uuid-A", key: "temperature", isPublished: true,  humanReadableName: "Temperature", userGroups: ["group-1", "group-2"] }
{ datasetId: "uuid-A", key: "pressure",    isPublished: true,  humanReadableName: "",            userGroups: ["group-1", "group-2"] }
{ datasetId: "uuid-B", key: "temperature", isPublished: false, humanReadableName: "Temperature", userGroups: ["group-1"] }
```

> `ownerGroup` is a mandatory field, so no null fallback is needed. `accessGroups` is optional so it falls back to `[]`.

---

### Stage 4 — Unwind userGroups

One document per `(dataset, key, group)`. This is the pivot that makes per-group counting possible.

`preserveNullAndEmptyArrays: true` keeps datasets with no groups so `usageCount` stays accurate.

```
Input
{ datasetId: "uuid-A", key: "temperature", humanReadableName: "Temperature", isPublished: true, userGroups: ["group-1", "group-2"] }

Output
{ datasetId: "uuid-A", key: "temperature", humanReadableName: "Temperature", isPublished: true,  userGroups: "group-1" }
{ datasetId: "uuid-A", key: "temperature", humanReadableName: "Temperature", isPublished: true,  userGroups: "group-2" }
{ datasetId: "uuid-A", key: "pressure",    humanReadableName: "",            isPublished: true,  userGroups: "group-1" }
{ datasetId: "uuid-A", key: "pressure",    humanReadableName: "",            isPublished: true,  userGroups: "group-2" }
{ datasetId: "uuid-B", key: "temperature", humanReadableName: "Temperature", isPublished: false, userGroups: "group-1" }
```

---

### Stage 5 — Filter null userGroups

Drop documents where `userGroups` is `null`. This only occurs when `preserveNullAndEmptyArrays` retains a document from a dataset that had no groups at all.

```
Input:  stream from stage 5, some may have userGroups: null
Output: only documents where userGroups is a real group name
```

---

### Stage 6 — Group by (metaKeyId, group)

Each bucket is one unique `(key, humanReadableName, group)` combination.
`groupCount` = how many datasets with this group reference this key.

```
Input (5 documents from stage 6)
{ datasetId: "uuid-A", key: "temperature", humanReadableName: "Temperature", isPublished: true,  userGroups: "group-1" }
{ datasetId: "uuid-A", key: "temperature", humanReadableName: "Temperature", isPublished: true,  userGroups: "group-2" }
{ datasetId: "uuid-A", key: "pressure",    humanReadableName: "",            isPublished: true,  userGroups: "group-1" }
{ datasetId: "uuid-A", key: "pressure",    humanReadableName: "",            isPublished: true,  userGroups: "group-2" }
{ datasetId: "uuid-B", key: "temperature", humanReadableName: "Temperature", isPublished: false, userGroups: "group-1" }

Output (4 buckets — one per unique metaKeyId + group)
{ _id: { metaKeyId: "Dataset_temperature_Temperature", group: "group-1" }, key: "temperature", humanReadableName: "Temperature", isPublished: true,  groupCount: 2 }
{ _id: { metaKeyId: "Dataset_temperature_Temperature", group: "group-2" }, key: "temperature", humanReadableName: "Temperature", isPublished: true,  groupCount: 1 }
{ _id: { metaKeyId: "Dataset_pressure_",               group: "group-1" }, key: "pressure",    humanReadableName: "",            isPublished: true,  groupCount: 1 }
{ _id: { metaKeyId: "Dataset_pressure_",               group: "group-2" }, key: "pressure",    humanReadableName: "",            isPublished: true,  groupCount: 1 }
```

> `isPublished: $max` means the field is `true` if **any** contributing dataset is published.

---

### Stage 7 — Group by metaKeyId

Reassemble one document per metadata key by collecting the per-group buckets from stage 7.

```
Input (4 buckets from stage 7)
{ _id: { metaKeyId: "Dataset_temperature_Temperature", group: "group-1" }, groupCount: 2, ... }
{ _id: { metaKeyId: "Dataset_temperature_Temperature", group: "group-2" }, groupCount: 1, ... }
{ _id: { metaKeyId: "Dataset_pressure_",               group: "group-1" }, groupCount: 1, ... }
{ _id: { metaKeyId: "Dataset_pressure_",               group: "group-2" }, groupCount: 1, ... }

Output (2 documents — one per unique key)
{
  _id: "Dataset_temperature_Temperature",
  key: "temperature", humanReadableName: "Temperature", isPublished: true,
  userGroups: ["group-1", "group-2"],
  userGroupCountsArr: [{ k: "group-1", v: 2 }, { k: "group-2", v: 1 }],
  datasetIdSets: [["uuid-A", "uuid-B"], ["uuid-A"]]
}
{
  _id: "Dataset_pressure_",
  key: "pressure", humanReadableName: "", isPublished: true,
  userGroups: ["group-1", "group-2"],
  userGroupCountsArr: [{ k: "group-1", v: 1 }, { k: "group-2", v: 1 }],
  datasetIdSets: [["uuid-A"], ["uuid-A"]]
}
```

---

### Stage 8 — Final projection

- `userGroupCounts`: converts `[{k, v}]` array to a plain object (Mongoose stores this as a `Map`)
- `usageCount`: unions all per-group `datasetId` sets and counts distinct IDs

```
// usageCount for temperature:
// datasetIdSets = [["uuid-A", "uuid-B"], ["uuid-A"]]
// union         = ["uuid-A", "uuid-B"]
// count         = 2
```

```js
// Output (final document written to MetadataKeys)
{
  _id: "Dataset_temperature_Temperature",
  key: "temperature",
  sourceType: "Dataset",
  humanReadableName: "Temperature",
  isPublished: true,
  userGroups: ["group-1", "group-2"],
  userGroupCounts: { "group-1": 2, "group-2": 1 },
  usageCount: 2,
  createdBy: "migration",
  createdAt: ISODate("...")
}
```

---

### Stage 9 — Merge into MetadataKeys

- `whenNotMatched: insert` — new documents are inserted as-is
- `whenMatched` — additively merges counts when two `SOURCE_COLLECTIONS` produce the same `_id`

> This is not triggered today since `sourceType` is part of `_id`, making collisions between collections impossible. It is kept correct for when `Proposal`, `Sample`, or other collections are added as sources.

```js
// whenMatched userGroupCounts example
// existing: { "group-1": 3, "group-2": 1 }
// incoming: { "group-1": 2, "group-3": 5 }
// result:   { "group-1": 5, "group-2": 1, "group-3": 5 }
```

---

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
