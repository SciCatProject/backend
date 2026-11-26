const { randomUUID } = require("node:crypto");
const { encodeURIComponentExtended } = require("../dist/common/utils");

const BATCH_SIZE = 10000;
const MAX_KEYS_PER_FLUSH = 10000;

function decodeSegment(key) {
  try {
    return decodeURIComponent(key);
  } catch {
    return key;
  }
}

function isMetadataEntry(value) {
  return ["value", "valueSI", "unit", "unitSI", "v", "u", "human_name"].some(
    (field) => Object.prototype.hasOwnProperty.call(value, field),
  );
}

function* collectEntries(metadata, parentPath = []) {
  for (const [storedKey, value] of Object.entries(metadata ?? {})) {
    const path = [...parentPath, decodeSegment(storedKey)];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !isMetadataEntry(value)
    ) {
      yield* collectEntries(value, path);
    } else {
      const humanReadableName =
        typeof value?.human_name === "string" ? value.human_name : "";
      yield {
        key: path.join("."),
        humanReadableName,
      };
    }
  }
}

function toUpsert(entry, now) {
  const id = randomUUID();
  return {
    updateOne: {
      filter: {
        sourceType: "Dataset",
        key: entry.key,
        humanReadableName: entry.humanReadableName,
      },
      update: {
        $set: { updatedAt: now },
        $inc: {
          usageCount: entry.usageCount,
          ...Object.fromEntries(
            Object.entries(entry.userGroupCounts).map(([group, count]) => [
              `userGroupCounts.${encodeURIComponentExtended(group)}`,
              count,
            ]),
          ),
        },
        $max: { isPublished: entry.isPublished },
        $addToSet: {
          userGroups: { $each: Object.keys(entry.userGroupCounts) },
        },
        $setOnInsert: {
          _id: id,
          id,
          createdBy: "migration",
          updatedBy: "migration",
          createdAt: now,
        },
      },
      upsert: true,
    },
  };
}

module.exports = {
  async up(db) {
    const start = Date.now();
    const datasets = db.collection("Dataset");
    const match = { scientificMetadata: { $exists: true, $type: "object" } };
    const total = await datasets.countDocuments(match);
    const metadataKeys = db.collection("MetadataKeys");
    await metadataKeys.deleteMany({ sourceType: "Dataset" });

    const keys = new Map();
    let processed = 0;
    const logProgress = () => {
      const elapsed = ((Date.now() - start) / 1000).toFixed(1);
      console.log(
        `[${elapsed}s] Dataset: ${processed.toLocaleString()}/${total.toLocaleString()}`,
      );
    };
    const flush = async () => {
      if (keys.size === 0) return;
      const now = new Date();
      await metadataKeys.bulkWrite(
        Array.from(keys.values(), (entry) => toUpsert(entry, now)),
        { ordered: false },
      );
      keys.clear();
    };

    for await (const dataset of datasets.find(match, {
      batchSize: BATCH_SIZE,
      projection: {
        scientificMetadata: 1,
        ownerGroup: 1,
        accessGroups: 1,
        isPublished: 1,
      },
    })) {
      const groups = Array.from(
        new Set(
          [dataset.ownerGroup, ...(dataset.accessGroups ?? [])].filter(Boolean),
        ),
      );
      for (const entry of collectEntries(dataset.scientificMetadata)) {
        const mapKey = JSON.stringify([entry.key, entry.humanReadableName]);
        const current = keys.get(mapKey) ?? {
          key: entry.key,
          humanReadableName: entry.humanReadableName,
          userGroupCounts: Object.create(null),
          usageCount: 0,
          isPublished: false,
        };
        current.usageCount += 1;
        current.isPublished ||= dataset.isPublished ?? false;
        for (const group of groups) {
          current.userGroupCounts[group] =
            (current.userGroupCounts[group] ?? 0) + 1;
        }
        keys.set(mapKey, current);
        if (keys.size >= MAX_KEYS_PER_FLUSH) {
          await flush();
        }
      }
      processed += 1;
      if (processed % BATCH_SIZE === 0) {
        await flush();
        logProgress();
      }
    }
    await flush();
    if (processed === 0 || processed % BATCH_SIZE !== 0) {
      logProgress();
    }
  },

  async down(db) {
    await db.collection("MetadataKeys").deleteMany({ sourceType: "Dataset" });
  },
};
