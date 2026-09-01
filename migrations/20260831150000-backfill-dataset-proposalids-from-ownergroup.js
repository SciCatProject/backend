/**
 *
 * Backfills proposalIds on raw Datasets that don't have one set yet, by
 * matching the dataset's ownerGroup against Proposal.ownerGroup. Since
 * ownerGroup is not unique on Proposal, a dataset can end up linked to
 * more than one proposal.
 *
 * A broad/shared ownerGroup could otherwise match an unreasonable number of
 * unrelated proposals, so a dataset whose ownerGroup matches more than
 * MAX_PROPOSALS_PER_OWNER_GROUP proposals only gets linked to the first
 * MAX_PROPOSALS_PER_OWNER_GROUP of them, and the truncation is logged,
 * instead of writing an unbounded proposalIds array.
 */

const MAX_PROPOSALS_PER_OWNER_GROUP = 100;
const CHUNK_SIZE = 1000;

function warnTruncatedProposals(warnedOwnerGroups, ownerGroup, proposalCount) {
  if (warnedOwnerGroups.has(ownerGroup)) return;

  warnedOwnerGroups.add(ownerGroup);
  console.warn(
    `ownerGroup "${ownerGroup}" matches ${proposalCount} proposals; ` +
      `only linking the first ${MAX_PROPOSALS_PER_OWNER_GROUP}.`,
  );
}

// Returns the Proposal docs matching ownerGroup (capped at
// MAX_PROPOSALS_PER_OWNER_GROUP), or null if there are none.
async function getMatchingProposals(db, ownerGroup, warnedOwnerGroups) {
  const proposalCount = await db
    .collection("Proposal")
    .countDocuments({ ownerGroup });

  if (proposalCount === 0) return null;

  if (proposalCount > MAX_PROPOSALS_PER_OWNER_GROUP) {
    warnTruncatedProposals(warnedOwnerGroups, ownerGroup, proposalCount);
  }

  return db
    .collection("Proposal")
    .find({ ownerGroup }, { projection: { proposalId: 1 } })
    .limit(MAX_PROPOSALS_PER_OWNER_GROUP)
    .toArray();
}

// Pulls the proposalIds out of the matched proposals and, in the same pass,
// tallies how many datasets each one is about to be linked to in this chunk.
function extractProposalIdsAndTally(proposals, proposalIncrements) {
  const proposalIds = [];
  for (const proposal of proposals) {
    proposalIds.push(proposal.proposalId);
    proposalIncrements.set(
      proposal.proposalId,
      (proposalIncrements.get(proposal.proposalId) || 0) + 1,
    );
  }
  return proposalIds;
}

function buildProposalIdsUpdateOp(datasetId, proposalIds) {
  return {
    updateOne: {
      filter: {
        _id: datasetId,
        $or: [
          { proposalIds: { $exists: false } },
          { proposalIds: { $size: 0 } },
        ],
      },
      update: { $set: { proposalIds } },
    },
  };
}

async function flushChunk(db, datasetOps, proposalIncrements) {
  if (datasetOps.length === 0) return { modifiedCount: 0, unModifiedCount: 0 };

  const bulkWriteResult = await db
    .collection("Dataset")
    .bulkWrite(datasetOps, { ordered: false });

  if (proposalIncrements.size > 0) {
    await db.collection("Proposal").bulkWrite(
      [...proposalIncrements.entries()].map(([proposalId, count]) => ({
        updateOne: {
          filter: { proposalId },
          update: { $inc: { numberOfDatasets: count } },
        },
      })),
      { ordered: false },
    );
  }

  return {
    modifiedCount: bulkWriteResult.modifiedCount,
    unModifiedCount: datasetOps.length - bulkWriteResult.modifiedCount,
  };
}

module.exports = {
  async up(db) {
    let modifiedCount = 0;
    let unModifiedCount = 0;
    let datasetOps = [];
    let proposalIncrements = new Map();
    const warnedOwnerGroups = new Set();

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
      const proposals = await getMatchingProposals(
        db,
        dataset.ownerGroup,
        warnedOwnerGroups,
      );
      if (!proposals) continue;

      const proposalIds = extractProposalIdsAndTally(
        proposals,
        proposalIncrements,
      );
      datasetOps.push(buildProposalIdsUpdateOp(dataset._id, proposalIds));

      if (datasetOps.length === CHUNK_SIZE) {
        const result = await flushChunk(db, datasetOps, proposalIncrements);
        modifiedCount += result.modifiedCount;
        unModifiedCount += result.unModifiedCount;
        datasetOps = [];
        proposalIncrements = new Map();
        console.log(
          "migrating, count, unModifiedCount: ",
          modifiedCount,
          unModifiedCount,
        );
      }
    }

    const finalResult = await flushChunk(db, datasetOps, proposalIncrements);
    modifiedCount += finalResult.modifiedCount;
    unModifiedCount += finalResult.unModifiedCount;

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
