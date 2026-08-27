"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenProposalIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser51 = null,
  accessTokenAdmin = null,
  proposalPi1 = null,
  datasetPidPi1 = null,
  datasetPidNoProposal = null;

const proposalOwnedByPi1 = {
  ...TestData.ProposalCorrectMin,
  proposalId: "checkaccesstest0001",
  pi_email: "user1@your.site",
  ownerGroup: "group1",
};

describe("1196: Jobs: Test check-create-access endpoint", () => {
  before(async () => {
    db.collection("Proposal").deleteMany({});
    db.collection("Dataset").deleteMany({});
    db.collection("Job").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenProposalIngestor = await utils.getToken(appUrl, {
      username: "proposalIngestor",
      password: TestData.Accounts["proposalIngestor"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenUser51 = await utils.getToken(appUrl, {
      username: "user5.1",
      password: TestData.Accounts["user5.1"]["password"],
    });

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });
  });

  after(() => {
    db.collection("Proposal").deleteMany({});
    db.collection("Dataset").deleteMany({});
    db.collection("Job").deleteMany({});
  });

  it("0010: Add a proposal with pi_email set to user1's email", async () => {
    return request(appUrl)
      .post("/api/v3/Proposals")
      .send(proposalOwnedByPi1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenProposalIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        proposalPi1 = res.body["proposalId"];
      });
  });

  it("0020: Add dataset owned by proposal with pi_email set to user1, in group1", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "group1",
      accessGroups: [],
      proposalId: proposalPi1,
    };

    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPidPi1 = res.body["pid"];
      });
  });

  it("0030: Add dataset in group1 with no linked proposal", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "group1",
      accessGroups: [],
    };

    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPidNoProposal = res.body["pid"];
      });
  });

  it("0040: As the Principal Investigator (user1), only the PI-linked dataset is eligible for pi_access, and a non-existent pid is dropped", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({
        type: "pi_access",
        datasetIds: [datasetPidPi1, datasetPidNoProposal, "does-not-exist"],
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("eligibleDatasetIds")
          .and.deep.equal([datasetPidPi1]);
      });
  });

  it("0050: As a user who is not the Principal Investigator (user5.1), no dataset is eligible for pi_access", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({
        type: "pi_access",
        datasetIds: [datasetPidPi1, datasetPidNoProposal],
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("eligibleDatasetIds").and.deep.equal([]);
      });
  });

  it("0060: As a user from ADMIN_GROUPS, every existing dataset is eligible for pi_access regardless of PI", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({
        type: "pi_access",
        datasetIds: [datasetPidPi1, datasetPidNoProposal],
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.eligibleDatasetIds.should.have
          .members([datasetPidPi1, datasetPidNoProposal])
          .and.have.lengthOf(2);
      });
  });

  it("0070: As user1, both datasets are eligible for owner_access (#datasetOwner), since both are owned by group1", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({
        type: "owner_access",
        datasetIds: [datasetPidPi1, datasetPidNoProposal],
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.eligibleDatasetIds.should.have
          .members([datasetPidPi1, datasetPidNoProposal])
          .and.have.lengthOf(2);
      });
  });

  it("0080: As user5.1 (not in group1), no dataset is eligible for owner_access", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({
        type: "owner_access",
        datasetIds: [datasetPidPi1, datasetPidNoProposal],
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("eligibleDatasetIds").and.deep.equal([]);
      });
  });

  it("0090: As an anonymous user, both datasets are eligible for all_access (#all, job-level auth)", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({
        type: "all_access",
        datasetIds: [datasetPidPi1, datasetPidNoProposal],
      })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.eligibleDatasetIds.should.have
          .members([datasetPidPi1, datasetPidNoProposal])
          .and.have.lengthOf(2);
      });
  });

  it("0100: As an anonymous user, no dataset is eligible for pi_access", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({
        type: "pi_access",
        datasetIds: [datasetPidPi1],
      })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("eligibleDatasetIds").and.deep.equal([]);
      });
  });

  it("0110: An empty datasetIds list returns an empty eligible list", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({ type: "pi_access", datasetIds: [] })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("eligibleDatasetIds").and.deep.equal([]);
      });
  });

  it("0120: An unknown job type is rejected", async () => {
    return request(appUrl)
      .post("/api/v4/jobs/check-create-access")
      .send({ type: "not_a_real_job_type", datasetIds: [datasetPidPi1] })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.BadRequestStatusCode);
  });
});
