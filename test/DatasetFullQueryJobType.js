"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenAdmin = null,
  accessTokenUser1 = null,
  accessTokenUser3 = null,
  datasetPidOwnedByGroup1 = null,
  datasetPidOwnedByGroup3 = null,
  datasetPidPublic = null,
  datasetPidAccessibleByGroup1 = null,
  datasetPidPolicyListMatch = null;

// ownerGroup group1 -> user1, group3 -> user3 (see JobsDatasetOwner.js/JobsDatasetAccess.js)
const datasetOwnedByGroup1 = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "group1",
  accessGroups: [],
};

const datasetOwnedByGroup3 = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "group3",
  accessGroups: [],
};

const datasetPublic = {
  ...TestData.RawCorrect,
  isPublished: true,
  ownerGroup: "group3",
  accessGroups: [],
};

const datasetAccessibleByGroup1 = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "group3",
  accessGroups: ["group1"],
};

const policyListPolicy = {
  ownerGroup: "fullquery-jobtype-policylist",
  manager: ["adminIngestor"],
  jobPolicies: {
    policy_list_access: {
      allowedList: ["user1@your.site"],
    },
  },
};

const datasetPolicyListMatch = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "fullquery-jobtype-policylist",
  accessGroups: [],
};

describe("3100: DatasetFullQueryJobType: Test fullquery pre-filtering by job type eligibility", () => {
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

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });

    await request(appUrl)
      .post("/api/v4/policies")
      .send(policyListPolicy)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode);

    datasetPidOwnedByGroup1 = (
      await request(appUrl)
        .post("/api/v3/Datasets")
        .send(datasetOwnedByGroup1)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
    ).body.pid;

    datasetPidOwnedByGroup3 = (
      await request(appUrl)
        .post("/api/v3/Datasets")
        .send(datasetOwnedByGroup3)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
    ).body.pid;

    datasetPidPublic = (
      await request(appUrl)
        .post("/api/v3/Datasets")
        .send(datasetPublic)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
    ).body.pid;

    datasetPidAccessibleByGroup1 = (
      await request(appUrl)
        .post("/api/v3/Datasets")
        .send(datasetAccessibleByGroup1)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
    ).body.pid;

    datasetPidPolicyListMatch = (
      await request(appUrl)
        .post("/api/v3/Datasets")
        .send(datasetPolicyListMatch)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
    ).body.pid;
  });

  after(async () => {
    await Promise.all([
      db.collection("Policy").deleteMany({}),
      db.collection("Dataset").deleteMany({}),
      db.collection("Job").deleteMany({}),
    ]);
  });

  const fullquery = (fields, token) => {
    const req = request(appUrl)
      .get(
        `/api/v3/Datasets/fullquery?fields=${encodeURIComponent(
          JSON.stringify(fields),
        )}`,
      )
      .set("Accept", "application/json");
    if (token) req.set({ Authorization: `Bearer ${token}` });
    return req;
  };

  it("0010: owner_access (#datasetOwner): user1 only sees the dataset owned by their own group", async () => {
    return fullquery({ jobType: "owner_access" }, accessTokenUser1)
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const pids = res.body.map((d) => d.pid);
        pids.should.deep.equal([datasetPidOwnedByGroup1]);
      });
  });

  it("0020: owner_access (#datasetOwner): user3 only sees the dataset owned by their own group", async () => {
    return fullquery({ jobType: "owner_access" }, accessTokenUser3)
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const pids = res.body.map((d) => d.pid);
        pids.should.deep.equal([datasetPidOwnedByGroup3]);
      });
  });

  it("0030: owner_access (#datasetOwner): an admin sees every dataset regardless of ownerGroup", async () => {
    return fullquery({ jobType: "owner_access" }, accessTokenAdmin)
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const pids = res.body.map((d) => d.pid);
        pids.should.include.members([
          datasetPidOwnedByGroup1,
          datasetPidOwnedByGroup3,
          datasetPidPublic,
          datasetPidAccessibleByGroup1,
          datasetPidPolicyListMatch,
        ]);
      });
  });

  it("0040: owner_access (#datasetOwner): an unauthenticated user sees no datasets, even published ones", async () => {
    return fullquery({ jobType: "owner_access" })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").that.is.empty;
      });
  });

  it("0050: dataset_access (#datasetAccess): user1 sees datasets they own, have accessGroups on, and public ones", async () => {
    return fullquery({ jobType: "dataset_access" }, accessTokenUser1)
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const pids = res.body.map((d) => d.pid);
        pids.should.have.members([
          datasetPidOwnedByGroup1,
          datasetPidAccessibleByGroup1,
          datasetPidPublic,
        ]);
        pids.should.not.include(datasetPidOwnedByGroup3);
      });
  });

  it("0060: dataset_access (#datasetAccess): an unauthenticated user only sees published datasets", async () => {
    return fullquery({ jobType: "dataset_access" })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const pids = res.body.map((d) => d.pid);
        pids.should.deep.equal([datasetPidPublic]);
      });
  });

  it("0070: public_access (#datasetPublic): user1 only sees published datasets, regardless of ownership", async () => {
    return fullquery({ jobType: "public_access" }, accessTokenUser1)
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const pids = res.body.map((d) => d.pid);
        pids.should.deep.equal([datasetPidPublic]);
      });
  });

  it("0080: policy_list_access (#datasetPolicyList): user1, whose email is in the policy's allowedList, sees the matching dataset", async () => {
    return fullquery({ jobType: "policy_list_access" }, accessTokenUser1)
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const pids = res.body.map((d) => d.pid);
        pids.should.deep.equal([datasetPidPolicyListMatch]);
      });
  });

  it("0090: policy_list_access (#datasetPolicyList): user3, who is not in the policy's allowedList, sees no datasets", async () => {
    return fullquery({ jobType: "policy_list_access" }, accessTokenUser3)
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").that.is.empty;
      });
  });

  it("0100: an unconfigured job type returns no datasets rather than erroring", async () => {
    return fullquery({ jobType: "not_a_real_job_type" }, accessTokenUser1)
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").that.is.empty;
      });
  });

  it("0110: jobType composes with an explicit filter instead of replacing it", async () => {
    // datasetPidOwnedByGroup1 is owned by user1's group but not published,
    // so requiring both isPublished and owner_access eligibility together
    // should exclude it even though owner_access alone would include it.
    return fullquery(
      { jobType: "owner_access", isPublished: true },
      accessTokenUser1,
    )
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").that.is.empty;
      });
  });
});
