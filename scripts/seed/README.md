# Dataset Seed Script

Creates mock datasets in MongoDB for performance testing.

## Usage

```bash
node scripts/seed/seed-datasets.js [total]
```

### Examples

```bash
# Seed 20,000 datasets (default)
node scripts/seed/seed-datasets.js

# Seed 5,000 datasets
node scripts/seed/seed-datasets.js 5000
```

## Parameters

The following constants can be adjusted directly in the script:

| Parameter                            | Default                     | Description                                                                                                                |
| ------------------------------------ | --------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `MONGO_URI`                          | `mongodb://localhost:27017` | MongoDB connection string                                                                                                  |
| `DB_NAME`                            | `performance-testing`       | Target database name                                                                                                       |
| `COLLECTION`                         | `Dataset`                   | Target collection name                                                                                                     |
| `BATCH_SIZE`                         | `1000`                      | Number of documents inserted per batch                                                                                     |
| `SCIENTIFIC_METADATA_MIN`            | `5`                         | Minimum number of metadata keys per dataset                                                                                |
| `SCIENTIFIC_METADATA_MAX`            | `10`                        | Maximum number of metadata keys per dataset                                                                                |
| `SCIENTIFIC_METADATA_KEY_UNIQUENESS` | `0.2`                       | Fraction of metadata keys that are unique per dataset (0–1). The remainder are drawn from a shared pool of 10 common keys. |
| `ISPUBLISHED_PROBABILITY`            | `0.2`                       | Fraction of datasets that will have isPublished: true (0–1).                                                               |
