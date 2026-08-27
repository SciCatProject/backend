"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser51 = null,
  accessTokenAdmin = null,
  datasetPidGroup1 = null,
  datasetPidGroup5 = null,
  datasetPidNoPolicy = null,
  datasetPidEmptyPolicy = null;

const policyGroup1 = {
  ...TestData.PolicyCorrect,
  ownerGroup: "pitest-group1",
  dataDeleteEmails: ["user1@your.site"],
};

const policyGroup5 = {
  ...TestData.PolicyCorrect,
  ownerGroup: "pitest-group5",
  dataDeleteEmails: ["user5.1@your.site"],
};

const policyEmptyGroup = {
  ...TestData.PolicyCorrect,
  ownerGroup: "pitest-emptypolicy",
};

const jobDatasetPi = {
  type: "dataset_delete_access",
};

describe("1195: Jobs: Test New Job Model Authorization for dataset_delete_access jobs type", () => {
  before(async () => {
    await Promise.all([
      db.collection("Policy").deleteMany({}),
      db.collection("Dataset").deleteMany({}),
      db.collection("Job").deleteMany({}),
    ]);

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
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

  after(async () => {
    await Promise.all([
      db.collection("Policy").deleteMany({}),
      db.collection("Dataset").deleteMany({}),
      db.collection("Job").deleteMany({}),
    ]);
  });

  it("0010: Add a policy for group1 with user1 in dataDeleteEmails", async () => {
    return request(appUrl)
      .post("/api/v3/Policies")
      .send(policyGroup1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("dataDeleteEmails")
          .and.be.eql(["user1@your.site"]);
      });
  });

  it("0020: Add a policy for group5 with user5.1 in dataDeleteEmails", async () => {
    return request(appUrl)
      .post("/api/v3/Policies")
      .send(policyGroup5)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("dataDeleteEmails")
          .and.be.eql(["user5.1@your.site"]);
      });
  });

  it("0030: Add a policy for a group with no dataDeleteEmails set", async () => {
    return request(appUrl)
      .post("/api/v3/Policies")
      .send(policyEmptyGroup)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("dataDeleteEmails").and.be.eql([]);
      });
  });

  it("0040: Add dataset owned by group1", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "pitest-group1",
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
        datasetPidGroup1 = res.body["pid"];
      });
  });

  it("0050: Add dataset owned by group5", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "pitest-group5",
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
        datasetPidGroup5 = res.body["pid"];
      });
  });

  it("0060: Add dataset owned by a group with no policy at all", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "pitest-nopolicy",
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
        datasetPidNoPolicy = res.body["pid"];
      });
  });

  it("0070: Add dataset owned by a group whose policy has no dataDeleteEmails", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "pitest-emptypolicy",
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
        datasetPidEmptyPolicy = res.body["pid"];
      });
  });

  it("0080: Add a new job as a user listed in the ownerGroup's policy dataDeleteEmails", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidGroup1, files: [] }],
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

  it("0090: Add a new job as a user not listed in the ownerGroup's policy, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPidGroup1, files: [] }],
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
            "User does not have access to all datasets, cannot create job.",
          );
      });
  });

  it("0100: Add a new job as user1 for a dataset owned by group1, and user5.1 for one owned by group5, spanning both groups user1 is not authorized for group5", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [
          { pid: datasetPidGroup1, files: [] },
          { pid: datasetPidGroup5, files: [] },
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
            "User does not have access to all datasets, cannot create job.",
          );
      });
  });

  it("0110: Add a new job for a dataset with no linked policy, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidNoPolicy, files: [] }],
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
            "User does not have access to all datasets, cannot create job.",
          );
      });
  });

  it("0120: Add a new job for a dataset whose policy has no dataDeleteEmails, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidEmptyPolicy, files: [] }],
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
            "User does not have access to all datasets, cannot create job.",
          );
      });
  });

  it("0130: Add a new job as an unauthenticated user, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPi,
      jobParams: {
        datasetList: [{ pid: datasetPidGroup1, files: [] }],
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

  it("0140: Add a new job as a user from ADMIN_GROUPS for a dataset they are not listed as an authorized deleter of, which should be allowed", async () => {
    const newJob = {
      ...jobDatasetPi,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [{ pid: datasetPidGroup1, files: [] }],
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
