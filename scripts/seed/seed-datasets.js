const { MongoClient } = require("mongodb");
const { randomUUID } = require("crypto");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "performance-testing";
const COLLECTION = "Dataset";
const TOTAL = parseInt(process.argv[2] ?? "20000"); // total number of datasets to create
const BATCH_SIZE = 1000;
const ISPUBLISHED_PROBABILITY = 0.2; // 20% of datasets will be published
const SCIENTIFIC_METADATA_MIN = 5; // min number of metadata keys per dataset
const SCIENTIFIC_METADATA_MAX = 10; // max number of metadata keys per dataset
const SCIENTIFIC_METADATA_KEY_UNIQUENESS = 0.2; // 80% of keys will be from shared keys, 20% completely random and unique per dataset

const WORDS = [
  "beam",
  "pulse",
  "sample",
  "detector",
  "energy",
  "voltage",
  "current",
  "flux",
  "angle",
  "distance",
];
const SYMBOLS = ["_", "-", "."];
const UNITS = ["mm", "cm", "kg", "K", "Pa", "eV", ""];

// 10 fixed shared scientificMetadata keys that appear across datasets
const SHARED_KEYS = [
  "file_size",
  "job_id",
  "temperature",
  "pressure",
  "wavelength",
  "beam_energy",
  "detector_distance",
  "exposure_time",
  "sample_name",
  "run_number",
];

// For each shared key, 4 possible human-readable names (including null) to create some variation
const HUMAN_NAMES_MAP = {
  file_size: ["File Size", "Taille du fichier", "Dateigröße", null],
  job_id: ["Job ID", "Job Identifier", "Task ID", null],
  temperature: ["Temperature", "Temp", "Temperatur", null],
  pressure: ["Pressure", "Druck", "Pression", null],
  wavelength: ["Wavelength", "Wave Length", "Wellenlänge", null],
  beam_energy: ["Beam Energy", "Strahlenergie", "Énergie du faisceau", null],
  detector_distance: ["Detector Distance", "Detektorabstand", null],
  exposure_time: ["Exposure Time", "Belichtungszeit", null],
  sample_name: ["Sample Name", "Probenname", "Nom échantillon", null],
  run_number: ["Run Number", "Laufnummer", null],
};

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomString(length = randomInt(3, 8)) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  return Array.from(
    { length },
    () => chars[Math.floor(Math.random() * chars.length)],
  ).join("");
}

function randomUniqueKey() {
  // completely random key — unlikely to be duplicated across datasets
  const patterns = [
    () =>
      `${randomItem(WORDS)}${randomItem(SYMBOLS)}${randomInt(1, 9999).toString().padStart(4, "0")}`,
    () => `${randomItem(WORDS)}${randomItem(SYMBOLS)}${randomString(6)}`,
    () => randomString(randomInt(6, 12)),
  ];
  return randomItem(patterns)();
}

const TOTAL_GROUPS = Math.round(TOTAL / randomInt(5, 10));
const GROUP_POOL = Array.from(
  new Set(
    Array.from({ length: TOTAL_GROUPS * 2 }, () =>
      randomInt(100000, 999999).toString(),
    ),
  ),
).slice(0, TOTAL_GROUPS);

function generateScientificMetadata() {
  const metadata = {};
  const count = randomInt(SCIENTIFIC_METADATA_MIN, SCIENTIFIC_METADATA_MAX);

  let attempts = 0;
  while (Object.keys(metadata).length < count && attempts < count * 3) {
    attempts++;
    const useRandomKey = Math.random() < SCIENTIFIC_METADATA_KEY_UNIQUENESS;

    if (useRandomKey) {
      const key = randomUniqueKey();
      if (!metadata[key]) {
        const humanName = Math.random() < 0.5 && {
          human_name: randomString(randomInt(5, 15)),
        };
        metadata[key] = {
          value: randomInt(1, 999999),
          unit: randomItem(UNITS),
          ...(humanName !== false && humanName),
        };
      }
    } else {
      // 80% chance — pick from shared keys
      const key = randomItem(SHARED_KEYS);
      if (!metadata[key]) {
        // 50% chance of human_name
        const humanName =
          Math.random() < 0.5 && randomItem(HUMAN_NAMES_MAP[key]);
        metadata[key] = {
          value: randomInt(1, 999999),
          unit: randomItem(UNITS),
          ...(humanName !== false && { human_name: humanName }),
        };
      }
    }
  }

  return metadata;
}

function generateDataset(index) {
  const id = randomUUID();

  return {
    _id: id,
    id,
    pid: id,
    owner: `user_${randomString(randomInt(1, 10))}`,
    ownerEmail: `user${randomString(randomInt(1, 10))}@your.site`,
    contactEmail: `user.${randomString(randomInt(1, 10))}@test.eu`,
    sourceFolder: `/ess/data/seed-test/${index}`,
    size: randomInt(0, 1_000_000),
    packedSize: 0,
    numberOfFiles: randomInt(0, 10),
    numberOfFilesArchived: 0,
    creationTime: new Date(
      Date.now() - randomInt(0, 365 * 24 * 60 * 60 * 1000),
    ),
    type: randomItem(["raw", "derived"]),
    validationStatus: "n/a",
    keywords: [`seed-test-${index}`],
    description: `Seed test dataset ${index}`,
    datasetName: `Seed Test Dataset ${index}`,
    isPublished: Math.random() < ISPUBLISHED_PROBABILITY,
    techniques: [],
    scientificMetadata: generateScientificMetadata(),
    principalInvestigators: [`investigator_${randomInt(1, 5)}`],
    endTime: new Date(),
    creationLocation: randomItem(["BEER", "MAGIC", "DREAM", "CODA", "FROST"]),
    dataFormat: "unknown",
    ownerGroup: randomItem(GROUP_POOL),
    accessGroups: Array.from({ length: randomInt(1, 5) }, () =>
      randomItem(GROUP_POOL),
    ),
    proposalIds: [`proposal_${randomInt(1, 100)}`],
    sampleIds: [`sample_${randomInt(1, 1000)}`],
    instrumentIds: [`instrument_${randomInt(1, 50)}`],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

async function main() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db(DB_NAME);
  const col = db.collection(COLLECTION);

  console.log(`Inserting ${TOTAL} migration test datasets...`);
  console.log(`Shared keys: ${SHARED_KEYS.join(", ")}`);
  console.log(
    `Each dataset will have ${SCIENTIFIC_METADATA_KEY_UNIQUENESS * 100}% unique keys`,
  );
  let inserted = 0;

  while (inserted < TOTAL) {
    const batch = Array.from(
      { length: Math.min(BATCH_SIZE, TOTAL - inserted) },
      (_, i) => generateDataset(inserted + i),
    );
    await col.insertMany(batch, { ordered: false });
    inserted += batch.length;
    console.log(`Inserted ${inserted}/${TOTAL}`);
  }

  // Print few example summary of documents to verify scientificMetadata structure
  const sample = await col
    .find({ keywords: { $elemMatch: { $regex: "^seed-test" } } })
    .limit(5)
    .toArray();

  console.log(
    "\n\x1b[32mPrint few example summary of documents to verify scientificMetadata structure:\x1b[0m",
  );
  sample.forEach((doc, i) => {
    console.log(`\nDataset ${i + 1} PID: ${doc.pid}`);
    Object.entries(doc.scientificMetadata).forEach(([key, val]) => {
      const isShared = SHARED_KEYS.includes(key);
      console.log(
        `  [${isShared ? "shared" : "random"}] ${key}: human_name="${val.human_name ?? "(none)"}"`,
      );
    });
  });

  await client.close();
}

main().catch(console.error);
