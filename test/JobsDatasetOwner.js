"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  accessTokenUser3 = null,
  accessTokenUser51 = null,
  accessTokenUser6 = null,
  accessTokenAdmin = null,

  datasetPid1 = null,
  datasetPid2 = null,
  datasetPid3 = null,
  datasetPidGroup6 = null,
  datasetPidUser6 = null,

  jobId1 = null,
  encodedJobOwnedByAdmin = null,
  jobId2 = null,
  encodedJobOwnedByUser1 = null,
  jobId3 = null,
  encodedJobOwnedByGroup1 = null,
  jobId4 = null,
  encodedJobOwnedByUser51 = null,
  jobId5 = null,
  encodedJobOwnedByGroup5 = null,
  jobId6 = null,
  encodedJobOwnedByAnonym = null,
  jobId7 = null,
  encodedJobOwnedByUser3 = null,
  jobId12 = null,
  jobId21 = null,
  jobId52 = null,
  encodedJobOwnedByUser52 = null;

const dataset1 = {
  ...TestData.RawCorrect,
  isPublished: true,
  ownerGroup: "group1",
  accessGroups: ["group5"],
};

const dataset2 = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "group3",
  accessGroups: [],
};

const dataset3 = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "group5",
  accessGroups: ["group1"],
};

const jobDatasetOwner = {
  type: "owner_access",
};

describe("1150: Jobs: Test New Job Model Authorization for owner_access jobs type", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("Job").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts["user2"]["password"],
    });

    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });

    accessTokenUser51 = await utils.getToken(appUrl, {
      username: "user5.1",
      password: TestData.Accounts["user5.1"]["password"],
    });

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });

    accessTokenUser6 = await utils.getToken(appUrl, {
      username: "user6",
      password: TestData.Accounts["user6"]["password"],
    });
  });

  after(() => {
    db.collection("Dataset").deleteMany({});
    db.collection("Job").deleteMany({});
  });

  it("0010: Add dataset 1 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.equal("group1");
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("isPublished").and.equal(true);
        res.body.should.have.property("pid").and.be.string;
        datasetPid1 = res.body["pid"];
      });
  });

  it("0020: Add dataset 2 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.equal("group3");
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("isPublished").and.equal(false);
        res.body.should.have.property("pid").and.be.string;
        datasetPid2 = res.body["pid"];
      });
  });

  it("0030: Add dataset 3 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.equal("group5");
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("isPublished").and.equal(false);
        res.body.should.have.property("pid").and.be.string;
        datasetPid3 = res.body["pid"];
      });
  });

  it("0040: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("admin");
        res.body.should.have.property("ownerUser").and.be.equal("admin");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId1 = res.body["id"];
        encodedJobOwnedByAdmin = encodeURIComponent(jobId1);
      });
  });

  it("0050: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: datasetPid2, files: [] },
          { pid: datasetPid3, files: [] },
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("admin");
        res.body.should.have.property("ownerUser").and.be.equal("admin");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0060: Add a new job as a user from ADMIN_GROUPS for another user in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: datasetPid2, files: [] },
          { pid: datasetPid3, files: [] },
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
        res.body.should.have.property("ownerUser").and.be.equal("user1");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId2 = res.body["id"];
        encodedJobOwnedByUser1 = encodeURIComponent(jobId2);
      });
  });

  it("0070: Add a new job as a user from ADMIN_GROUPS for another group in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerGroup: "group1",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: datasetPid2, files: [] },
          { pid: datasetPid3, files: [] },
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
        res.body.should.not.have.property("ownerUser");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId3 = res.body["id"];
        encodedJobOwnedByGroup1 = encodeURIComponent(jobId3);
      });
  });

  it("0080: Add a new job as a user from ADMIN_GROUPS for another group in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerGroup: "group5",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: datasetPid2, files: [] },
          { pid: datasetPid3, files: [] },
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
        res.body.should.not.have.property("ownerUser");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId5 = res.body["id"];
        encodedJobOwnedByGroup5 = encodeURIComponent(jobId5);
      });
  });

  it("0090: Add a new job as a user from ADMIN_GROUPS for anonymous user in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      contactEmail: "test@email.scicat",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: datasetPid2, files: [] },
          { pid: datasetPid3, files: [] },
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.not.have.property("ownerGroup");
        res.body.should.not.have.property("ownerUser");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(newJob.contactEmail);
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId6 = res.body["id"];
        encodedJobOwnedByAnonym = encodeURIComponent(jobId6);
      });
  });

  it("0100: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for himself/herself in '#datasetOwner' configuration with dataset owned by his/her group", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
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
        jobId7 = res.body["id"];
      });
  });

  it("0110: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for himself/herself in '#datasetOwner' configuration with only one of two datasets owned by his/her group, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user1",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: datasetPid3, files: [] },
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
          .and.be.equal("User does not have access to all datasets, cannot create job.");
      });
  });

  it("0120: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for another user in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user5.2",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPid3, files: [] }],
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
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
        res.body.should.have.property("ownerUser").and.be.equal("user5.2");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId52 = res.body["id"];
        encodedJobOwnedByUser52 = encodeURIComponent(jobId52);
      });
  });

  it("0130: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for another user in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user5.2",
      jobParams: {
        datasetList: [{ pid: datasetPid3, files: [] }],
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
        res.body.should.not.have.property("ownerGroup");
        res.body.should.have.property("ownerUser").and.be.equal("user5.2");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId52 = res.body["id"];
        encodedJobOwnedByUser52 = encodeURIComponent(jobId52);
      });
  });

  it("0140: Add a new job as a normal user for himself/herself in '#datasetOwner' configuration with datasets owned by his/her group", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPid3, files: [] }],
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
        jobId4 = res.body["id"];
        encodedJobOwnedByUser51 = encodeURIComponent(jobId4);
      });
  });

  it("0150: Add a new job as a normal user for himself/herself in '#datasetOwner' configuration with datasets not owned by his/her group, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
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
          .and.be.equal("User does not have access to all datasets, cannot create job.");
      });
  });

  it("0160: Add a new job as a user from ADMIN_GROUPS for group3 and user1 in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user1",
      ownerGroup: "group3",
      jobParams: {
        datasetList: [{ pid: datasetPid2, files: [] }],
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerUser").and.be.equal("user1");
        res.body.should.have.property("ownerGroup").and.be.equal("group3");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId12 = res.body["id"];
      });
  });

  it("0170: Add a new job as a user from ADMIN_GROUPS for group1 and user2 in '#datasetOwner' configuration", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user2",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPid2, files: [] }],
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
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerUser").and.be.equal("user2");
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId21 = res.body["id"];
      });
  });

  it("0180: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for another user in '#datasetOwner' configuration, where the user is not an owner of some of these datasets, which should be forbidden", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user3",
      ownerGroup: "group3",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: datasetPid2, files: [] },
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
          .and.be.equal("User does not have access to all datasets, cannot create job.");
      });
  });

  it("0190: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for another user in '#datasetOwner' configuration, where the user is owner of these datasets", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user3",
      ownerGroup: "group3",
      jobParams: {
        datasetList: [{ pid: datasetPid2, files: [] }],
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
        res.body.should.have.property("ownerUser").and.be.equal("user3");
        res.body.should.have.property("ownerGroup").and.be.equal("group3");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId7 = res.body["id"];
        encodedJobOwnedByUser3 = encodeURIComponent(jobId7);
      });
  });

  it("0200: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for group1 and user3 in '#datasetOwner' configuration, which should be forbiiden", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user3",
      ownerGroup: "group1",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: datasetPid3, files: [] },
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
          .and.be.equal("User does not have access to all datasets, cannot create job.");
      });
  });

  it("0210: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for anonymous user in '#datasetOwner' configuration, which should be forbiiden", async () => {
    const newJob = {
      ...jobDatasetOwner,
      contactEmail: "test@email.scicat",
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
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
          .and.be.equal("User does not belong to any group, cannot create job with #datasetOwner authorization.");
      });
  });

  it("0220: Add a status update to a job as a user from ADMIN_GROUPS for his/her job in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0230: Add a Status update to a job as a user from ADMIN_GROUPS for another group's job in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0240: Add a Status update to a job as a user from ADMIN_GROUPS for anonymous user's job in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0250: Add a Status update to a job as a user from ADMIN_GROUPS for anonymous user's job in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0260: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for his/her job in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser3}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0270: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user's job in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0280: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for job owned by CREATE_JOB_PRIVILEGED_GROUPS in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0290: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user's group in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0300: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for anonymous user's group in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0310: Add a Status update to a job as a user from CREATE_JOB_PRIVILEGED_GROUPS for other group in '#jobOwnerUser' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0320: Add a Status update to a job as a normal user  for his/her job in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0330: Add a Status update to a job as a normal user for another user's job in '#jobOwnerUser' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0340: Add a Status update to a job by his group with no ownerUser as a normal user in '#jobOwnerUser' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0350: Add a Status update to his/her job as a normal user in '#jobOwnerUser' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0360: Add a Status update to a job by his group but another user as a normal user in '#jobOwnerUser' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser52}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0370: Add a Status update to a job as a normal user for another user's group in '#jobOwnerUser' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0380: Add a Status update to a job as a normal user for anonymous user's group in '#jobOwnerUser' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0390: Add a Status update to a job as unauthenticated user for anonymous user's group in '#jobOwnerUser' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0400: Access jobs as a User1 ", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(13);
        res.body
          .map((job) => job.id)
          .should.include.members([jobId2, jobId3, jobId12, jobId21, jobId7]);
      });
  });

  it("0410: Access jobs as user2 ", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0420: Access jobs as user3", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(13);
      });
  });

  it("0430: Access jobs as user5.1", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
        res.body.map((job) => job.id).should.include.members([jobId4, jobId5]);
      });
  });

  it("0440: Add a new job as user6 with datasets owned by two different groups that user6 belongs to", async () => {
    const datasetGroup6 = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "group6",
      accessGroups: [],
    };

    const datasetUser6 = {
      ...TestData.RawCorrect,
      isPublished: false,
      ownerGroup: "user6",
      accessGroups: [],
    };

    const createdDatasetGroup6 = await request(appUrl)
      .post("/api/v3/Datasets")
      .send(datasetGroup6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);
    datasetPidGroup6 = createdDatasetGroup6.body.pid;

    const createdDatasetUser6 = await request(appUrl)
      .post("/api/v3/Datasets")
      .send(datasetUser6)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);
    datasetPidUser6 = createdDatasetUser6.body.pid;

    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user6",
      ownerGroup: "group6",
      jobParams: {
        datasetList: [
          { pid: datasetPidGroup6, files: [] },
          { pid: datasetPidUser6, files: [] },
        ],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser6}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerUser").and.be.equal("user6");
        res.body.should.have.property("ownerGroup").and.be.equal("group6");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });
  it("0450: Add a new job as user6 with datasets owned by two different groups, one of which user6 does not belong to", async () => {
    const newJob = {
      ...jobDatasetOwner,
      ownerUser: "user6",
      ownerGroup: "group6",
      jobParams: {
        datasetList: [
          { pid: datasetPidGroup6, files: [] },
          { pid: datasetPid3, files: [] },
        ],
      },
    };
    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser6}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("User does not have access to all datasets, cannot create job.");
      });
  });

});
