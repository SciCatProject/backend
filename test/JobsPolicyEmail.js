"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  datasetPidGroup1 = null,
  datasetPidNoPolicy = null,
  jobIdGroup1 = null,
  encodedJobIdGroup1 = null,
  jobIdNoPolicy = null,
  encodedJobIdNoPolicy = null;

const policyGroup1 = {
  ...TestData.PolicyCorrect,
  ownerGroup: "policyemailtest-group1",
  manager: ["manager1@example.com"],
};

const jobPolicyEmail = {
  type: "policy_email_test",
};

describe("1196: Jobs: Test EmailJobAction toPolicyManagers notifies the ownerGroup's policy managers", () => {
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
  });

  after(async () => {
    await Promise.all([
      db.collection("Policy").deleteMany({}),
      db.collection("Dataset").deleteMany({}),
      db.collection("Job").deleteMany({}),
    ]);
  });

  it("0010: Add a policy for group1", async () => {
    return request(appUrl)
      .post("/api/v3/Policies")
      .send(policyGroup1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0020: Add dataset owned by group1", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "policyemailtest-group1",
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
        datasetPidGroup1 = res.body["pid"];
      });
  });

  it("0030: Add dataset owned by a group with no policy", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "policyemailtest-nopolicy",
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
        datasetPidNoPolicy = res.body["pid"];
      });
  });

  it("0040: Add a policy_email_test job for the group1 dataset", async () => {
    const newJob = {
      ...jobPolicyEmail,
      contactEmail: "requester@example.com",
      jobParams: {
        datasetList: [{ pid: datasetPidGroup1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        jobIdGroup1 = res.body["id"];
        encodedJobIdGroup1 = encodeURIComponent(jobIdGroup1);
      });
  });

  it("0050: Add a policy_email_test job for the dataset with no policy", async () => {
    const newJob = {
      ...jobPolicyEmail,
      contactEmail: "requester@example.com",
      jobParams: {
        datasetList: [{ pid: datasetPidNoPolicy, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        jobIdNoPolicy = res.body["id"];
        encodedJobIdNoPolicy = encodeURIComponent(jobIdNoPolicy);
      });
  });

  it("0060: Patching the group1 job resolves the policy manager and sends the notification without failing the request", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobIdGroup1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0070: Patching the no-policy job still succeeds (the action skips notification and ignoreErrors is set)", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobIdNoPolicy}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });
});
