const { randomUUID } = require("node:crypto");

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

function collectEntries(metadata, parentPath = [], output = []) {
  for (const [storedKey, value] of Object.entries(metadata ?? {})) {
    const path = [...parentPath, decodeSegment(storedKey)];
    if (
      value !== null &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      !isMetadataEntry(value)
    ) {
      collectEntries(value, path, output);
    } else {
      output.push({
        key: path.join("."),
        humanReadableName: value?.human_name ?? "",
      });
    }
  }
  return output;
}

module.exports = {
  async up(db) {
    const keys = new Map();

    for await (const dataset of db.collection("Dataset").find(
      { scientificMetadata: { $exists: true, $type: "object" } },
      {
        projection: {
          scientificMetadata: 1,
          ownerGroup: 1,
          accessGroups: 1,
          isPublished: 1,
        },
      },
    )) {
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
          userGroups: new Set(),
          userGroupCounts: {},
          usageCount: 0,
          isPublished: false,
        };
        current.usageCount += 1;
        current.isPublished ||= dataset.isPublished ?? false;
        for (const group of groups) {
          current.userGroups.add(group);
          current.userGroupCounts[group] =
            (current.userGroupCounts[group] ?? 0) + 1;
        }
        keys.set(mapKey, current);
      }
    }

    await db.collection("MetadataKeys").deleteMany({ sourceType: "Dataset" });

    const now = new Date();
    const documents = Array.from(keys.values(), (entry) => {
      const id = randomUUID();
      return {
        _id: id,
        id,
        key: entry.key,
        humanReadableName: entry.humanReadableName,
        sourceType: "Dataset",
        userGroups: Array.from(entry.userGroups),
        userGroupCounts: entry.userGroupCounts,
        usageCount: entry.usageCount,
        isPublished: entry.isPublished,
        createdBy: "migration",
        createdAt: now,
        updatedAt: now,
      };
    });

    for (let offset = 0; offset < documents.length; offset += 1000) {
      await db
        .collection("MetadataKeys")
        .insertMany(documents.slice(offset, offset + 1000));
    }
  },

  async down(db) {
    await db.collection("MetadataKeys").deleteMany({ sourceType: "Dataset" });
  },
};
