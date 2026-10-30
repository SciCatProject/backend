/* eslint-disable @typescript-eslint/no-require-imports */

/**
 * Migration: Add optional resource ID fields to PublishedData.
 *
 * Existing values are preserved. Each missing field is populated independently
 * so partially migrated documents are not overwritten.
 */
module.exports = {
  async up(db) {
    const collection = db.collection("PublishedData");
    const fields = ["proposalIds", "sampleIds", "instrumentIds"];
    let modifiedCount = 0;

    for (const field of fields) {
      const result = await collection.updateMany(
        {
          $or: [{ [field]: { $exists: false } }, { [field]: null }],
        },
        { $set: { [field]: [] } },
      );
      modifiedCount += result.modifiedCount;
      console.log(
        `Migration completed: Added ${field} to ${result.modifiedCount} PublishedData documents`,
      );
    }

    const totalDocuments = await collection.countDocuments({});
    const documentsWithAllFields = await collection.countDocuments({
      proposalIds: { $exists: true },
      sampleIds: { $exists: true },
      instrumentIds: { $exists: true },
    });

    console.log(
      `Verification: ${documentsWithAllFields}/${totalDocuments} documents have all ID fields`,
    );

    return {
      modifiedCount,
      totalDocuments,
      documentsWithAllFields,
    };
  },

  async down(db) {
    // The migration cannot safely remove fields that may have pre-existing or
    // subsequently written values, so rollback is intentionally a no-op.
    console.log(`Rollback completed: Nothing to do!`);

    return { modifiedCount: 0 };
  },
};
