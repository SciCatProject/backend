"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenProposalIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser51 = null,
  accessTokenAdmin = null,
  proposalPi1 = null,
  proposalPi51 = null,
  proposalNoPiEmail = null,
  datasetPidPi1 = null,
  datasetPidPi51 = null,
  datasetPidMultiPi = null,
  datasetPidNoProposal = null,
  datasetPidUnassignedProposal = null;

const proposalOwnedByPi1 = {
  ...TestData.ProposalCorrectMin,
  proposalId: "pitest0001",
  pi_email: "user1@your.site",
  ownerGroup: "group1",
};

const proposalOwnedByPi51 = {
  ...TestData.ProposalCorrectMin,
  proposalId: "pitest0002",
  pi_email: "user5.1@your.site",
  ownerGroup: "group5",
};

const proposalWithoutPiEmail = {
  ...TestData.ProposalCorrectMin,
  proposalId: "pitest0003",
  ownerGroup: "group1",
};

const jobDatasetPi = {
  type: "pi_access",
};

describe("1195: Jobs: Test New Job Model Authorization for pi_access jobs type", () => {
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
        res.body.should.have.property("proposalId").and.be.string;
        res.body.should.have
          .property("pi_email")
          .and.be.equal("user1@your.site");
        proposalPi1 = res.body["proposalId"];
      });
  });

  it("0020: Add a proposal with pi_email set to user5.1's email", async () => {
    return request(appUrl)
      .post("/api/v3/Proposals")
      .send(proposalOwnedByPi51)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenProposalIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("proposalId").and.be.string;
        res.body.should.have
          .property("pi_email")
          .and.be.equal("user5.1@your.site");
        proposalPi51 = res.body["proposalId"];
      });
  });

  it("0030: Add a proposal without a pi_email", async () => {
    return request(appUrl)
      .post("/api/v3/Proposals")
      .send(proposalWithoutPiEmail)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenProposalIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("proposalId").and.be.string;
        res.body.should.not.have.property("pi_email");
        proposalNoPiEmail = res.body["proposalId"];
      });
  });

  it("0040: Add dataset owned by proposal with pi_email set to user1", async () => {
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
        res.body.should.have.property("pid").and.be.string;
        datasetPidPi1 = res.body["pid"];
      });
  });

  it("0050: Add dataset owned by proposal with pi_email set to user5.1", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "group5",
      accessGroups: [],
      proposalId: proposalPi51,
    };

    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("pid").and.be.string;
        datasetPidPi51 = res.body["pid"];
      });
  });

  it("0060: Add dataset linked to both proposals (multiple PIs)", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "group1",
      accessGroups: [],
      proposalId: proposalPi1,
    };

    const createdDataset = await request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);
    createdDataset.body.should.have.property("pid").and.be.string;
    datasetPidMultiPi = createdDataset.body["pid"];

    return request(appUrl)
      .patch(`/api/v4/datasets/${encodeURIComponent(datasetPidMultiPi)}`)
      .send({ proposalIds: [proposalPi1, proposalPi51] })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0070: Add dataset with no linked proposal at all", async () => {
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
        res.body.should.have.property("pid").and.be.string;
        datasetPidNoProposal = res.body["pid"];
      });
  });

  it("0080: Add dataset linked to a proposal that has no pi_email", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "group1",
      accessGroups: [],
      proposalId: proposalNoPiEmail,
    };

    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("pid").and.be.string;
        datasetPidUnassignedProposal = res.body["pid"];
      });
  });

  it("0090: Add a new job as the dataset's Principal Investigator (user1) in '#datasetPi' configuration", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidPi1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
        res.body.should.have.property("ownerUser").and.be.equal("user1");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0100: Add a new job as a user who is not the Principal Investigator of the dataset, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPidPi1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal(
            "User is not the Principal Investigator for all datasets, cannot create job.",
          );
      });
  });

  it("0110: Add a new job as user1 for a dataset linked to multiple proposals, one of which has user1 as PI", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidMultiPi, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0120: Add a new job as user5.1 for the same multi-proposal dataset, since user5.1 is PI on one of the linked proposals", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPidMultiPi, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0130: Add a new job as user1 spanning a dataset they are PI of and one they are not, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [
          { pid: datasetPidPi1, files: [] },
          { pid: datasetPidPi51, files: [] },
        ],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal(
            "User is not the Principal Investigator for all datasets, cannot create job.",
          );
      });
  });

  it("0140: Add a new job for a dataset with no linked proposal, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidNoProposal, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal(
            "User is not the Principal Investigator for all datasets, cannot create job.",
          );
      });
  });

  it("0150: Add a new job for a dataset linked to a proposal with no pi_email, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidUnassignedProposal, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal(
            "User is not the Principal Investigator for all datasets, cannot create job.",
          );
      });
  });

  it("0160: Add a new job as an unauthenticated user, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      jobParams: {
        datasetList: [{ pid: datasetPidPi1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .expect(TestData.UnauthorizedStatusCode)
      .then((res) => {
        res.body.should.not.have.property("id");
      });
  });

  it("0170: Add a new job as a user from ADMIN_GROUPS for a dataset they are not the Principal Investigator of, which should be allowed", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [{ pid: datasetPidPi1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });
});
