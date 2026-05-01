"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null,
  accessTokenUser3 = null,
  accessTokenUser4 = null,
  accessTokenUser51 = null,
  accessTokenUser52 = null,
  accessTokenAdmin = null,

  datasetPid1 = null,
  datasetPid2 = null,
  datasetPid3 = null,

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
  encodedJobOwnedByUser52 = null,
  jobId8 = null,
  encodedJobOwnedByUser4 = null;

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

const jobGroup5 = {
  type: "group_access",
};

describe("1180: Jobs: Test New Job Model Authorization for group_access type: configuration set to a specific group - @group5", () => {
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

    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });

    accessTokenUser4 = await utils.getToken(appUrl, {
      username: "user4",
      password: TestData.Accounts["user4"]["password"],
    });
    accessTokenUser51 = await utils.getToken(appUrl, {
      username: "user5.1",
      password: TestData.Accounts["user5.1"]["password"],
    });

    accessTokenUser52 = await utils.getToken(appUrl, {
      username: "user5.2",
      password: TestData.Accounts["user5.2"]["password"],
    });

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
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

  it("0040: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "admin",
      ownerGroup: "admin",
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

  it("0050: Add a new job as a user from ADMIN_GROUPS for another user in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "user1",
      ownerGroup: "group1",
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

  it("0060: Add a new job as a user from ADMIN_GROUPS for another group in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerGroup: "group1",
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

  it("0070: Add a new job as a user from ADMIN_GROUPS for another group in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerGroup: "group5",
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

  it("0080: Add a new job as a user from ADMIN_GROUPS for another user in '@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
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
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group3");
        res.body.should.have.property("ownerUser").and.be.equal("user3");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0090: Add a new job as a user from ADMIN_GROUPS for anonymous user in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      contactEmail: "test@email.scicat",
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

  it("0100: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for his/her own group in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "user1",
      ownerGroup: "group1",
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
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
        res.body.should.have.property("ownerUser").and.be.equal("user1");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0110: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for user 5.1 in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "user5.1",
      ownerGroup: "group5",
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
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
        res.body.should.have.property("ownerUser").and.be.equal("user5.1");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0120: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for user 4 in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "user4",
      ownerGroup: "group4",
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
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group4");
        res.body.should.have.property("ownerUser").and.be.equal("user4");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId8 = res.body["id"];
        encodedJobOwnedByUser4 = encodeURIComponent(jobId8);
      });
  });

  it("0130: Add a new job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for user 5.1 in '#@group5' configuration, which should be forbidden", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "user5.1",
      ownerGroup: "group5",
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
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
      });
  });

  it("0140: Add a new job as a user 5.1 for himself/herself in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "user5.1",
      ownerGroup: "group5",
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

  it("0150: Add a new job as a user 5.1 for another user in his/her group in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerGroup: "group5",
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

  it("0160: Add a new job as a user 5.2 for himself/herself in '#@group5' configuration", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "user5.2",
      ownerGroup: "group5",
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
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
        res.body.should.have.property("ownerUser").and.be.equal("user5.2");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId7 = res.body["id"];
        encodedJobOwnedByUser52 = encodeURIComponent(jobId7);
      });
  });

  it("0170: Add a new job as a user 5.1 for another user in '#@group5' configuration, which should fail as bad request", async () => {
    const newJob = {
      ...jobGroup5,
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
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal(
            "Invalid new job. User owning the job should match user logged in.",
          );
      });
  });

  it("0180: Add a new job as user from UPDATE_JOB_PRIVILEGED_GROUPS for himself/herself in #@group5 configuration, which should be forbidden", async () => {
    const newJob = {
      ...jobGroup5,
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
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
      });
  });

  it("0190: Add a new job as a normal user not in group5 for himself/herself in #@group5 configuration, which should be forbidden", async () => {
    const newJob = {
      ...jobGroup5,
      ownerUser: "user4",
      ownerGroup: "group4",
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
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("Unauthorized to create this job.");
      });
  });

  it("0200: Add a status update to a job as a user from ADMIN_GROUPS for his/her job in '@group5' configuration", async () => {
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

  it("0210: Add a Status update to a job as a user from ADMIN_GROUPS for another group's job in '@group5' configuration", async () => {
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

  it("0220: Add a Status update to a job as a user from ADMIN_GROUPS for anonymous user's job in '@group5' configuration", async () => {
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

  it("0230: Add a Status update to a job as a user from ADMIN_GROUPS for anonymous user's job in '@group5' configuration", async () => {
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

  it("0240: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for his/her job in '@group5' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0250: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user's job in '@group5' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0260: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for his/her group in '@group5' configuration", async () => {
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

  it("0270: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user's group in '@group5' configuration", async () => {
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

  it("0280: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for anonymous user's group in '@group5' configuration", async () => {
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

  it("0290: Add a Status update to a job as a user from CREATE_JOB_PRIVILEGED_GROUPS for anonymous user's group in '@group5' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0300: Add a Status update to a job as user5.1 for his/her job in '@group5' configuration", async () => {
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

  it("0310: Add a Status update to a job as user5.1 for another user's job in '@group5' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0320: Add a Status update to a job as user5.1 for his/her group in '@group5' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0330: Add a Status update to a job as user5.1 for another user's group in '@group5' configuration", async () => {
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

  it("0340: Add a Status update to a job as user5.1 for anonymous user's group in '@group5' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0350: Add a Status update to a job as user5.2 for his/her job in '@group5' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser52}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0360: Add a Status update to a job as user5.2 for user's 5.1 in same group job in '@group5' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0370: Add a Status update to a job as user5.2 for another user in his/her group job in '@group5' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0380: Add a Status update to a job as a normal user for his/her job in '@group5' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser4}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0390: Add a Status update to a job as a normal user for user 5.1 job in '@group5' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser4}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0400: Access jobs as a user from ADMIN_GROUPS that were created by User5.2", async () => {
    const filter = {
      where: {
        createdBy: "user5.2",
      },
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
      });
  });

  it("0410: Get job of another user in his/her group as normal user", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser52}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("user5.2");
      });
  });

  it("0420: Get job from his/her own group as normal user", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
      });
  });

  it("0430: Fullquery jobs as a user from ADMIN_GROUPS that were created by User5.2", async () => {
    const filter = {
      where: {
        createdBy: "user5.2",
      },
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
      });
  });

  it("0440: Fullquery jobs as another normal user (user5.2)", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(5);
      });
  });

  it("0450: Fullfacet jobs as a user from ADMIN_GROUPS that were created by User5.1", async () => {
    const fields = {
      createdBy: "user5.1",
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query({ fields: JSON.stringify(fields) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 2 }] });
      });
  });

  it("0460: Fullfacet jobs as a user from ADMIN_GROUPS that were created by User5.2", async () => {
    const fields = {
      createdBy: "user5.2",
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query({ fields: JSON.stringify(fields) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 1 }] });
      });
  });

  it("0470: Fullfacet jobs as another normal user (user5.2)", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 5 }] });
      });
  });
});
