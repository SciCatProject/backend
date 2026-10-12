"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser3 = null,
  accessTokenAdmin = null,
  datasetPidUser1Pi = null,
  datasetPidOtherPi = null,
  datasetPidNoProposal = null,
  datasetPidGroup3 = null,
  datasetPidAccessGroup1 = null;

const proposalUser1Pi = {
  ...TestData.ProposalCorrectMin,
  proposalId: "pi-access-user1",
  pi_email: "USER1@your.site",
};

const proposalOtherPi = {
  ...TestData.ProposalCorrectMin,
  proposalId: "pi-access-other",
  pi_email: "pi@uni.edu",
};

const jobPi = {
  type: "pi_access",
};

const createDataset = (dataset) =>
  request(appUrl)
    .post("/api/v4/Datasets")
    .send({ ...TestData.RawCorrectMinV4, ...dataset })
    .set("Accept", "application/json")
    .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
    .expect(TestData.EntryCreatedStatusCode)
    .then((res) => res.body["pid"]);

const createJob = (job, token) => {
  const req = request(appUrl)
    .post("/api/v4/Jobs")
    .send({ ...jobPi, ...job })
    .set("Accept", "application/json");
  return token ? req.set({ Authorization: `Bearer ${token}` }) : req;
};

const cleanup = () =>
  Promise.all(
    ["Dataset", "Proposal", "Job"].map((c) => db.collection(c).deleteMany({})),
  );

describe("1155: Jobs: Test New Job Model Authorization for pi_access jobs type", () => {
  before(async () => {
    await cleanup();

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });
    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });
    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });
  });

  after(async () => {
    await cleanup();
  });

  it("0010: Add proposals and datasets as Admin Ingestor", async () => {
    for (const proposal of [proposalUser1Pi, proposalOtherPi])
      await request(appUrl)
        .post("/api/v3/Proposals")
        .send(proposal)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode);

    datasetPidUser1Pi = await createDataset({
      ownerGroup: "group1",
      proposalIds: [proposalUser1Pi.proposalId],
    });
    datasetPidOtherPi = await createDataset({
      ownerGroup: "group1",
      proposalIds: [proposalOtherPi.proposalId],
    });
    datasetPidNoProposal = await createDataset({ ownerGroup: "group1" });
    datasetPidGroup3 = await createDataset({
      ownerGroup: "group3",
      proposalIds: [proposalUser1Pi.proposalId],
    });
    datasetPidAccessGroup1 = await createDataset({
      ownerGroup: "group3",
      accessGroups: ["group1"],
      proposalIds: [proposalUser1Pi.proposalId],
    });
  });

  it("0020: Add a new job as user1, owner and PI of the dataset proposal (case insensitive email)", async () => {
    return createJob(
      {
        ownerUser: "user1",
        ownerGroup: "group1",
        jobParams: { datasetList: [{ pid: datasetPidUser1Pi, files: [] }] },
      },
      accessTokenUser1,
    )
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.equal("pi_access");
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
        res.body.should.have.property("ownerUser").and.be.equal("user1");
      });
  });

  it("0030: Add a new job as user1 including a dataset whose proposal has another PI, which should be forbidden", async () => {
    return createJob(
      {
        ownerUser: "user1",
        ownerGroup: "group1",
        jobParams: {
          datasetList: [
            { pid: datasetPidUser1Pi, files: [] },
            { pid: datasetPidOtherPi, files: [] },
          ],
        },
      },
      accessTokenUser1,
    ).expect(TestData.AccessForbiddenStatusCode);
  });

  it("0040: Add a new job as user1 for a dataset without proposal, which should be forbidden", async () => {
    return createJob(
      {
        ownerUser: "user1",
        ownerGroup: "group1",
        jobParams: { datasetList: [{ pid: datasetPidNoProposal, files: [] }] },
      },
      accessTokenUser1,
    ).expect(TestData.AccessForbiddenStatusCode);
  });

  it("0045: Add a new job as user1, PI with access to the dataset through accessGroups", async () => {
    return createJob(
      {
        ownerUser: "user1",
        ownerGroup: "group1",
        jobParams: {
          datasetList: [{ pid: datasetPidAccessGroup1, files: [] }],
        },
      },
      accessTokenUser1,
    )
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
      });
  });

  it("0050: Add a new job as user1, PI but without access to the dataset, which should be forbidden", async () => {
    return createJob(
      {
        ownerUser: "user1",
        ownerGroup: "group1",
        jobParams: { datasetList: [{ pid: datasetPidGroup3, files: [] }] },
      },
      accessTokenUser1,
    ).expect(TestData.AccessForbiddenStatusCode);
  });

  it("0060: Add a new job as user3, dataset owner but not PI, which should be forbidden", async () => {
    return createJob(
      {
        ownerUser: "user3",
        ownerGroup: "group3",
        jobParams: { datasetList: [{ pid: datasetPidGroup3, files: [] }] },
      },
      accessTokenUser3,
    ).expect(TestData.AccessForbiddenStatusCode);
  });

  it("0070: Add a new job as unauthenticated user, which should be forbidden", async () => {
    return createJob({
      jobParams: { datasetList: [{ pid: datasetPidUser1Pi, files: [] }] },
    }).expect(TestData.AccessForbiddenStatusCode);
  });

  it("0080: Add a new job as a user from ADMIN_GROUPS for a dataset with another PI", async () => {
    return createJob(
      {
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: { datasetList: [{ pid: datasetPidOtherPi, files: [] }] },
      },
      accessTokenAdmin,
    ).expect(TestData.EntryCreatedStatusCode);
  });
});
