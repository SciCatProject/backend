/**
 *
 * Backfills proposalIds on raw Datasets that don't have one set yet, by
 * matching the dataset's ownerGroup against Proposal.ownerGroup. Since
 * ownerGroup is not unique on Proposal, a dataset can end up linked to
 * more than one proposal.
 *
 * A broad/shared ownerGroup could otherwise match an unreasonable number of
 * unrelated proposals, so groups matching more than
 * MAX_PROPOSALS_PER_OWNER_GROUP proposals are skipped and logged instead of
 * writing a huge proposalIds array.
 */

const MAX_PROPOSALS_PER_OWNER_GROUP = 100;

module.exports = {
  async up(db) {
    const BATCH_SIZE = 10000;
    let modifiedCount = 0;
    let unModifiedCount = 0;
    let batch = [];
    const warnedOwnerGroups = new Set();

    const flushBatch = async () => {
      if (batch.length === 0) return;

      const ownerGroups = [
        ...new Set(batch.map((dataset) => dataset.ownerGroup)),
      ];
      const proposalIdsByOwnerGroup = new Map();
      const tooManyOwnerGroups = new Set();
      for await (const proposal of db
        .collection("Proposal")
        .find(
          { ownerGroup: { $in: ownerGroups } },
          { projection: { ownerGroup: 1, proposalId: 1 } },
        )) {
        if (!proposal.ownerGroup || !proposal.proposalId) continue;
        if (tooManyOwnerGroups.has(proposal.ownerGroup)) continue;

        const existing = proposalIdsByOwnerGroup.get(proposal.ownerGroup) || [];
        existing.push(proposal.proposalId);

        if (existing.length > MAX_PROPOSALS_PER_OWNER_GROUP) {
          proposalIdsByOwnerGroup.delete(proposal.ownerGroup);
          tooManyOwnerGroups.add(proposal.ownerGroup);
          if (!warnedOwnerGroups.has(proposal.ownerGroup)) {
            warnedOwnerGroups.add(proposal.ownerGroup);
            console.warn(
              `Skipping proposalIds backfill for ownerGroup "${proposal.ownerGroup}": ` +
                `more than ${MAX_PROPOSALS_PER_OWNER_GROUP} matching proposals.`,
            );
          }
          continue;
        }

        proposalIdsByOwnerGroup.set(proposal.ownerGroup, existing);
      }

      const bulkOps = [];
      for (const dataset of batch) {
        const proposalIds = proposalIdsByOwnerGroup.get(dataset.ownerGroup);
        if (!proposalIds || proposalIds.length === 0) continue;

        bulkOps.push({
          updateOne: {
            filter: { _id: dataset._id },
            update: { $set: { proposalIds } },
          },
        });
      }

      if (bulkOps.length > 0) {
        const bulkWriteResult = await db
          .collection("Dataset")
          .bulkWrite(bulkOps, { ordered: false });
        modifiedCount += bulkWriteResult.modifiedCount;
        unModifiedCount += bulkOps.length - bulkWriteResult.modifiedCount;
      }

      batch = [];
    };

    for await (const dataset of db.collection("Dataset").find(
      {
        type: "raw",
        $or: [
          { proposalIds: { $exists: false } },
          { proposalIds: { $size: 0 } },
        ],
      },
      { projection: { ownerGroup: 1 } },
    )) {
      batch.push(dataset);

      if (batch.length === BATCH_SIZE) {
        await flushBatch();
        console.log(
          "migrating, count, unModifiedCount: ",
          modifiedCount,
          unModifiedCount,
        );
      }
    }
    await flushBatch();

    console.log(
      "FINISHED: count, unModifiedCount: ",
      modifiedCount,
      unModifiedCount,
    );
  },

  async down(_db, _client) {
    // No path backward: we can't tell an auto-filled proposalIds value
    // apart from one a user set manually after this migration ran.
  },
};
