"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser51 = null,
  accessTokenAdmin = null,
  datasetPidEmailMatch = null,
  datasetPidGroupMatch = null,
  datasetPidNoPolicy = null,
  datasetPidEmptyAllowedList = null;

const policyEmailMatch = {
  ownerGroup: "policylisttest-email",
  manager: ["adminIngestor"],
  jobPolicies: {
    policy_list_access: {
      allowedList: ["user1@your.site"],
    },
  },
};

const policyGroupMatch = {
  ownerGroup: "policylisttest-group",
  manager: ["adminIngestor"],
  jobPolicies: {
    policy_list_access: {
      allowedList: ["group5"],
    },
  },
};

const policyEmptyAllowedList = {
  ownerGroup: "policylisttest-empty",
  manager: ["adminIngestor"],
  jobPolicies: {
    policy_list_access: {
      allowedList: [],
    },
  },
};

const jobDatasetPolicyList = {
  type: "policy_list_access",
};

describe("3000: Jobs: Test New Job Model Authorization for policy_list_access jobs type", () => {
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

  it("0010: Add a policy for group whose allowedList matches by email", async () => {
    return request(appUrl)
      .post("/api/v4/policies")
      .send(policyEmailMatch)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.jobPolicies.policy_list_access.allowedList.should.deep.equal([
          "user1@your.site",
        ]);
      });
  });

  it("0020: Add a policy for group whose allowedList matches by group", async () => {
    return request(appUrl)
      .post("/api/v4/policies")
      .send(policyGroupMatch)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.jobPolicies.policy_list_access.allowedList.should.deep.equal([
          "group5",
        ]);
      });
  });

  it("0030: Add a policy for a group with an empty allowedList", async () => {
    return request(appUrl)
      .post("/api/v4/policies")
      .send(policyEmptyAllowedList)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.jobPolicies.policy_list_access.allowedList.should.deep.equal(
          [],
        );
      });
  });

  it("0040: Add dataset owned by the email-match group", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "policylisttest-email",
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
        datasetPidEmailMatch = res.body["pid"];
      });
  });

  it("0050: Add dataset owned by the group-match group", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "policylisttest-group",
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
        datasetPidGroupMatch = res.body["pid"];
      });
  });

  it("0060: Add dataset owned by a group with no policy at all", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "policylisttest-nopolicy",
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

  it("0070: Add dataset owned by the group whose policy has an empty allowedList", async () => {
    const dataset = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "policylisttest-empty",
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
        datasetPidEmptyAllowedList = res.body["pid"];
      });
  });

  it("0080: Add a new job as a user whose email is listed in the ownerGroup policy's allowedList", async () => {
    const newJob = {
      ...jobDatasetPolicyList,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidEmailMatch, files: [] }],
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

  it("0090: Add a new job as a user whose group is listed in the ownerGroup policy's allowedList", async () => {
    const newJob = {
      ...jobDatasetPolicyList,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPidGroupMatch, files: [] }],
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
        res.body.should.have.property("ownerUser").and.be.equal("user5.1");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0100: Add a new job as a user neither listed by email nor by group, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPolicyList,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPidEmailMatch, files: [] }],
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

  it("0110: Add a new job spanning an authorized and an unauthorized dataset, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPolicyList,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [
          { pid: datasetPidEmailMatch, files: [] },
          { pid: datasetPidGroupMatch, files: [] },
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

  it("0120: Add a new job for a dataset with no linked policy, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPolicyList,
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

  it("0130: Add a new job for a dataset whose policy has an empty allowedList, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPolicyList,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPidEmptyAllowedList, files: [] }],
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

  it("0140: Add a new job as an unauthenticated user, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetPolicyList,
      jobParams: {
        datasetList: [{ pid: datasetPidEmailMatch, files: [] }],
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

  it("0150: Add a new job as a user from ADMIN_GROUPS for a dataset they are not listed in the allowedList of, which should be allowed", async () => {
    const newJob = {
      ...jobDatasetPolicyList,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [{ pid: datasetPidEmailMatch, files: [] }],
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
