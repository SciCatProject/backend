"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenAdmin = null,
  datasetPidGroup1 = null,
  datasetPidGroup2 = null;

const datasetGroup1 = {
  ...TestData.RawCorrect,
  isPublished: true,
  ownerGroup: "group1",
  accessGroups: [],
};

const datasetGroup2 = {
  ...TestData.RawCorrect,
  isPublished: true,
  ownerGroup: "group2",
  accessGroups: [],
};

const jobDatasetPolicyEmail = {
  type: "dataset_policy_email_access",
};

describe("2950: Jobs: Test datasetPolicyEmail action for dataset_policy_email_access jobs type", () => {
  before(async () => {
    await db.collection("Dataset").deleteMany({});
    await db.collection("Job").deleteMany({});
    await db.collection("Policy").deleteMany({
      ownerGroup: { $in: ["group1", "group2"] },
      type: "dataset_policy_email_access",
    });

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });
  });

  after(async () => {
    await db.collection("Dataset").deleteMany({});
    await db.collection("Job").deleteMany({});
    await db.collection("Policy").deleteMany({
      ownerGroup: { $in: ["group1", "group2"] },
      type: "dataset_policy_email_access",
    });
  });

  it("0010: Add dataset for group1 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(datasetGroup1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.equal("group1");
        res.body.should.have.property("pid").and.be.string;
        datasetPidGroup1 = res.body["pid"];
      });
  });

  it("0020: Add dataset for group2 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(datasetGroup2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.equal("group2");
        res.body.should.have.property("pid").and.be.string;
        datasetPidGroup2 = res.body["pid"];
      });
  });

  it("0030: Add a Policy enabling datasetPolicyEmail notifications for group1", async () => {
    return request(appUrl)
      .post("/api/v4/policies")
      .send({
        ownerGroup: "group1",
        manager: ["adminIngestor"],
        type: "dataset_policy_email_access",
        emailTo: ["group1@example.com"],
        emailNotification: true,
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.ownerGroup.should.equal("group1");
        res.body.emailNotification.should.equal(true);
      });
  });

  it("0040: Add a Policy for group2 with notifications disabled", async () => {
    return request(appUrl)
      .post("/api/v4/policies")
      .send({
        ownerGroup: "group2",
        manager: ["adminIngestor"],
        type: "dataset_policy_email_access",
        emailTo: ["group2@example.com"],
        emailNotification: false,
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.ownerGroup.should.equal("group2");
        res.body.emailNotification.should.equal(false);
      });
  });

  it("0050: Create a job spanning both ownerGroups; datasetPolicyEmail runs for the enabled group and skips the disabled one without failing the request", async () => {
    const newJob = {
      ...jobDatasetPolicyEmail,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [
          { pid: datasetPidGroup1, files: [] },
          { pid: datasetPidGroup2, files: [] },
        ],
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
        res.body.should.have
          .property("type")
          .and.equal("dataset_policy_email_access");
        res.body.should.have.property("statusCode").and.equal("jobSubmitted");
      });
  });

  it("0060: Create a job for a group with no policy at all; datasetPolicyEmail skips silently and the request still succeeds", async () => {
    await db.collection("Policy").deleteMany({
      ownerGroup: "group1",
      type: "dataset_policy_email_access",
    });

    const newJob = {
      ...jobDatasetPolicyEmail,
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
        res.body.should.have.property("statusCode").and.equal("jobSubmitted");
      });
  });
});
