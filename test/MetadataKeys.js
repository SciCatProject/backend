"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdmin = null;
let accessTokenArchiveManager = null;
let accessTokenUser1 = null;

let pidGroup1 = null; // ownerGroup: group1, not published
let pidGroup2 = null; // ownerGroup: group2, not published
let pidPublished = null; // ownerGroup: group2, isPublished: true

// ---------------------------------------------------------------------------
// Dataset fixtures — controlled ownerGroup for predictable access control
// ---------------------------------------------------------------------------
const datasetGroup1 = {
  ...TestData.DatasetWithScientificMetadataV4,
  ownerGroup: "group1",
  accessGroups: [],
  isPublished: false,
};

const datasetGroup2 = {
  ...TestData.DatasetWithScientificMetadataV4,
  ownerGroup: "group2",
  accessGroups: ["group2"],
  isPublished: false,
  // extra key exclusive to group2 so access control tests are unambiguous
  scientificMetadata: {
    ...TestData.DatasetWithScientificMetadataV4.scientificMetadata,
    group2_only_key: { value: "exclusive to group2" },
  },
};

const datasetPublished = {
  ...TestData.DatasetWithScientificMetadataV4,
  ownerGroup: "group2",
  accessGroups: ["group2"],
  isPublished: true,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
async function getMetadataKeys(filter, token) {
  const req = request(appUrl)
    .get(
      `/api/v4/metadatakeys?filter=${encodeURIComponent(JSON.stringify(filter))}`,
    )
    .set("Accept", "application/json");

  if (token) {
    req.set({ Authorization: `Bearer ${token}` });
  }

  return req
    .expect(TestData.SuccessfulGetStatusCode)
    .expect("Content-Type", /json/);
}

async function createDataset(dataset) {
  const res = await request(appUrl)
    .post("/api/v4/datasets")
    .send(dataset)
    .set("Accept", "application/json")
    .set({ Authorization: `Bearer ${accessTokenAdmin}` })
    .expect(TestData.EntryCreatedStatusCode);
  return res.body.pid;
}

async function patchDataset(pid, payload) {
  return request(appUrl)
    .patch("/api/v4/datasets/" + encodeURIComponent(pid))
    .send(payload)
    .set("Accept", "application/json")
    .set({ Authorization: `Bearer ${accessTokenAdmin}` })
    .expect(TestData.SuccessfulGetStatusCode);
}

async function deleteDataset(pid) {
  return request(appUrl)
    .delete("/api/v4/datasets/" + encodeURIComponent(pid))
    .set("Accept", "application/json")
    .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
    .expect(TestData.SuccessfulDeleteStatusCode);
}

describe("2000: MetadataKeys: Access Control and Search", () => {
  before(async () => {
    await db.collection("Dataset").deleteMany({});
    await db.collection("MetadataKeys").deleteMany({});

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    pidGroup1 = await createDataset(datasetGroup1);
    pidGroup2 = await createDataset(datasetGroup2);
    pidPublished = await createDataset(datasetPublished);
  });

  after(async () => {
    for (const pid of [pidGroup1, pidGroup2, pidPublished]) {
      if (pid) await deleteDataset(pid);
    }
  });

  // -------------------------------------------------------------------------
  // Basic access
  // -------------------------------------------------------------------------

  it("0100: admin can fetch metadata keys and gets results from all groups", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset" } },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.length.greaterThan(0);

    const allGroups = res.body.flatMap((k) => k.userGroups);
    allGroups.should.include("group1");
    allGroups.should.include("group2");
  });

  it("0110: user1 can fetch metadata keys and only sees group1 keys", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset" } },
      accessTokenUser1,
    );

    res.body.should.be.an("array").and.have.length.greaterThan(0);
    res.body.forEach((k) => {
      k.userGroups.should.include("group1");
    });
  });

  it("0120: user1 cannot see keys exclusive to group2", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset", key: "group2_only_key" } },
      accessTokenUser1,
    );

    res.body.should.be.an("array").and.have.lengthOf(0);
  });

  it("0130: unauthenticated user can only see published metadata keys", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset" } },
      null,
    );

    res.body.should.be.an("array");
    res.body.forEach((k) => {
      k.isPublished.should.equal(true);
    });
  });

  it("0140: unauthenticated user cannot see unpublished keys", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset", isPublished: false } },
      null,
    );

    res.body.should.be.an("array").and.have.lengthOf(0);
  });

  // -------------------------------------------------------------------------
  // Search — key
  // -------------------------------------------------------------------------

  it("0200: admin can search keys by exact key name", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset", key: "with_number" } },
      accessTokenAdmin,
    );

    res.body.should.be.an("array");
    res.body.forEach((k) => k.key.should.equal("with_number"));
  });

  it("0210: admin can search keys by partial key name using $regex", async () => {
    const res = await getMetadataKeys(
      {
        where: {
          sourceType: "Dataset",
          key: { $regex: "with_", $options: "i" },
        },
      },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.length.greaterThan(0);
    res.body.forEach((k) => k.key.should.match(/with_/i));
  });

  it("0220: regex search returns no results for non-matching pattern", async () => {
    const res = await getMetadataKeys(
      {
        where: {
          sourceType: "Dataset",
          key: { $regex: "nonexistent_xyz", $options: "i" },
        },
      },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.lengthOf(0);
  });

  it("0230: user1 regex search only returns keys from accessible groups", async () => {
    const res = await getMetadataKeys(
      {
        where: {
          sourceType: "Dataset",
          key: { $regex: "with_", $options: "i" },
        },
      },
      accessTokenUser1,
    );

    res.body.should.be.an("array");
    res.body.forEach((k) => k.userGroups.should.include("group1"));
  });

  // -------------------------------------------------------------------------
  // Search — humanReadableName
  // -------------------------------------------------------------------------

  it("0240: admin can search by humanReadableName using $regex", async () => {
    const res = await getMetadataKeys(
      {
        where: {
          sourceType: "Dataset",
          humanReadableName: { $regex: "pressure", $options: "i" },
        },
      },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.length.greaterThan(0);
    res.body.forEach((k) => k.humanReadableName.should.match(/pressure/i));
  });

  it("0250: humanReadableName regex search returns empty for no match", async () => {
    const res = await getMetadataKeys(
      {
        where: {
          sourceType: "Dataset",
          humanReadableName: { $regex: "nonexistent_xyz", $options: "i" },
        },
      },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.lengthOf(0);
  });

  it("0260: keys without human_name have empty humanReadableName", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset", key: "with_key_value" } },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.length.greaterThan(0);
    res.body[0].humanReadableName.should.equal("");
  });

  // -------------------------------------------------------------------------
  // Pagination
  // -------------------------------------------------------------------------

  it("0300: limit is respected", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset" }, limits: { limit: 2, skip: 0 } },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.length.at.most(2);
  });

  it("0310: skip is respected", async () => {
    const resAll = await getMetadataKeys(
      { where: { sourceType: "Dataset" }, limits: { limit: 100, skip: 0 } },
      accessTokenAdmin,
    );
    const resSkipped = await getMetadataKeys(
      { where: { sourceType: "Dataset" }, limits: { limit: 100, skip: 1 } },
      accessTokenAdmin,
    );

    resSkipped.body.length.should.equal(resAll.body.length - 1);
  });

  // -------------------------------------------------------------------------
  // Fields projection
  // -------------------------------------------------------------------------

  it("0400: fields projection returns only requested fields", async () => {
    const res = await getMetadataKeys(
      {
        where: { sourceType: "Dataset" },
        fields: ["key", "sourceType"],
        limits: { limit: 5, skip: 0 },
      },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.length.greaterThan(0);
    res.body.forEach((k) => {
      k.should.have.property("key");
      k.should.have.property("sourceType");
      k.should.not.have.property("userGroups");
      k.should.not.have.property("userGroupCounts");
      k.should.not.have.property("usageCount");
    });
  });

  // -------------------------------------------------------------------------
  // Response shape
  // -------------------------------------------------------------------------

  it("0500: response documents have expected shape", async () => {
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset" }, limits: { limit: 1, skip: 0 } },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.length.greaterThan(0);

    const doc = res.body[0];
    doc.should.have.property("key").and.be.a("string");
    doc.should.have.property("sourceType").and.equal("Dataset");
    doc.should.have.property("humanReadableName").and.be.a("string");
    doc.should.have.property("userGroups").and.be.an("array");
    doc.should.have.property("isPublished").and.be.a("boolean");
    doc.should.have.property("usageCount").and.be.a("number");
  });

  it("0510: usageCount reflects number of datasets using the key", async () => {
    // with_number exists in all 3 datasets created in before()
    const res = await getMetadataKeys(
      { where: { sourceType: "Dataset", key: "with_number" } },
      accessTokenAdmin,
    );

    res.body.should.be.an("array").and.have.length.greaterThan(0);
    res.body[0].usageCount.should.equal(3);
  });

  // -------------------------------------------------------------------------
  // Mutation tests
  // -------------------------------------------------------------------------

  it("0600: updating human_name renames the MetadataKey (delete old + insert new)", async () => {
    const pid = await createDataset({
      ...TestData.DatasetWithScientificMetadataV4,
      ownerGroup: "group1",
      accessGroups: [],
      isPublished: false,
      scientificMetadata: {
        rename_test_key: { value: 1, human_name: "Original Name" },
      },
    });

    // Old key exists
    const before = await getMetadataKeys(
      {
        where: {
          sourceType: "Dataset",
          key: "rename_test_key",
          humanReadableName: "Original Name",
        },
      },
      accessTokenAdmin,
    );
    before.body.should.have.lengthOf(1);

    await patchDataset(pid, {
      scientificMetadata: {
        rename_test_key: { value: 1, human_name: "Renamed Name" },
      },
    });

    // Old key gone
    const afterOld = await getMetadataKeys(
      {
        where: {
          sourceType: "Dataset",
          key: "rename_test_key",
          humanReadableName: "Original Name",
        },
      },
      accessTokenAdmin,
    );
    afterOld.body.should.have.lengthOf(0);

    // New key exists
    const afterNew = await getMetadataKeys(
      {
        where: {
          sourceType: "Dataset",
          key: "rename_test_key",
          humanReadableName: "Renamed Name",
        },
      },
      accessTokenAdmin,
    );
    afterNew.body.should.have.lengthOf(1);
    afterNew.body[0].usageCount.should.equal(1);

    await deleteDataset(pid);
  });

  it("0610: removing a key from scientificMetadata decrements usageCount", async () => {
    const pidA = await createDataset({
      ...TestData.DatasetWithScientificMetadataV4,
      ownerGroup: "group1",
      accessGroups: [],
      isPublished: false,
      scientificMetadata: { shared_key: { value: 1 } },
    });

    const pidB = await createDataset({
      ...TestData.DatasetWithScientificMetadataV4,
      ownerGroup: "group1",
      accessGroups: [],
      isPublished: false,
      scientificMetadata: { shared_key: { value: 2 } },
    });

    const filterKey = { where: { sourceType: "Dataset", key: "shared_key" } };

    // usageCount starts at 2
    const before = await getMetadataKeys(filterKey, accessTokenAdmin);
    before.body.should.have.lengthOf(1);
    before.body[0].usageCount.should.equal(2);

    // Remove key from datasetA
    await patchDataset(pidA, { scientificMetadata: {} });

    // usageCount drops to 1, key still exists
    const after = await getMetadataKeys(filterKey, accessTokenAdmin);
    after.body.should.have.lengthOf(1);
    after.body[0].usageCount.should.equal(1);

    await deleteDataset(pidA);
    await deleteDataset(pidB);
  });

  it("0620: removing a key from the last dataset deletes the MetadataKey entirely", async () => {
    const pid = await createDataset({
      ...TestData.DatasetWithScientificMetadataV4,
      ownerGroup: "group1",
      accessGroups: [],
      isPublished: false,
      scientificMetadata: { sole_key: { value: 42 } },
    });

    const filterKey = { where: { sourceType: "Dataset", key: "sole_key" } };

    const before = await getMetadataKeys(filterKey, accessTokenAdmin);
    before.body.should.have.lengthOf(1);
    before.body[0].usageCount.should.equal(1);

    await patchDataset(pid, { scientificMetadata: {} });

    const after = await getMetadataKeys(filterKey, accessTokenAdmin);
    after.body.should.have.lengthOf(0);

    await deleteDataset(pid);
  });

  it("0630: adding a new key to scientificMetadata creates a new MetadataKey", async () => {
    const pid = await createDataset({
      ...TestData.DatasetWithScientificMetadataV4,
      ownerGroup: "group1",
      accessGroups: [],
      isPublished: false,
      scientificMetadata: { original_key: { value: 1 } },
    });

    const filterNewKey = {
      where: { sourceType: "Dataset", key: "brand_new_key" },
    };

    // Key does not exist yet
    const before = await getMetadataKeys(filterNewKey, accessTokenAdmin);
    before.body.should.have.lengthOf(0);

    await patchDataset(pid, {
      scientificMetadata: {
        original_key: { value: 1 },
        brand_new_key: { value: 99, human_name: "Brand New Key" },
      },
    });

    const after = await getMetadataKeys(filterNewKey, accessTokenAdmin);
    after.body.should.have.lengthOf(1);
    after.body[0].key.should.equal("brand_new_key");
    after.body[0].humanReadableName.should.equal("Brand New Key");
    after.body[0].usageCount.should.equal(1);

    await deleteDataset(pid);
  });

  it("0640: changing ownerGroup updates userGroups — old group removed, new group added", async () => {
    const pid = await createDataset({
      ...TestData.DatasetWithScientificMetadataV4,
      ownerGroup: "group1",
      accessGroups: [],
      isPublished: false,
      scientificMetadata: { group_change_key: { value: 1 } },
    });

    const filterKey = {
      where: { sourceType: "Dataset", key: "group_change_key" },
    };

    const before = await getMetadataKeys(filterKey, accessTokenAdmin);
    before.body.should.have.lengthOf(1);
    before.body[0].userGroups.should.include("group1");
    before.body[0].userGroups.should.not.include("group2");

    await patchDataset(pid, { ownerGroup: "group2" });

    const after = await getMetadataKeys(filterKey, accessTokenAdmin);
    after.body.should.have.lengthOf(1);
    after.body[0].userGroups.should.include("group2");
    after.body[0].userGroups.should.not.include("group1");

    // user1 (group1) can no longer see this key
    const user1Res = await getMetadataKeys(filterKey, accessTokenUser1);
    user1Res.body.should.have.lengthOf(0);

    await deleteDataset(pid);
  });

  it("0650: deleting a dataset decrements usageCount — deletes MetadataKey when it reaches 0", async () => {
    const pidA = await createDataset({
      ...TestData.DatasetWithScientificMetadataV4,
      ownerGroup: "group1",
      accessGroups: [],
      isPublished: false,
      scientificMetadata: { delete_test_key: { value: 1 } },
    });

    const pidB = await createDataset({
      ...TestData.DatasetWithScientificMetadataV4,
      ownerGroup: "group1",
      accessGroups: [],
      isPublished: false,
      scientificMetadata: { delete_test_key: { value: 2 } },
    });

    const filterKey = {
      where: { sourceType: "Dataset", key: "delete_test_key" },
    };

    const before = await getMetadataKeys(filterKey, accessTokenAdmin);
    before.body.should.have.lengthOf(1);
    before.body[0].usageCount.should.equal(2);

    // Delete first dataset — usageCount drops to 1, key still exists
    await deleteDataset(pidA);

    const afterFirst = await getMetadataKeys(filterKey, accessTokenAdmin);
    afterFirst.body.should.have.lengthOf(1);
    afterFirst.body[0].usageCount.should.equal(1);

    // Delete second dataset — usageCount hits 0, MetadataKey removed
    await deleteDataset(pidB);

    const afterSecond = await getMetadataKeys(filterKey, accessTokenAdmin);
    afterSecond.body.should.have.lengthOf(0);
  });
});
