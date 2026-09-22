"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser3 = null,
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

const jobUser51 = {
  type: "user_access",
};

describe("1190: Jobs: Test New Job Model Authorization for user_access type: configuration set to a specific user: USER5.1", () => {
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

  it("0040: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0050: Add a new job as a user from ADMIN_GROUPS for another user in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0060: Add a new job as a user from ADMIN_GROUPS for another group in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0070: Add a new job as a user from ADMIN_GROUPS for another group in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0080: Add a new job as a user from ADMIN_GROUPS for another user in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
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

  it("0090: Add a new job as a user from ADMIN_GROUPS for anonymous user in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0100: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for himself/herself user in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0110: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for user5.1 in '#USER5.1' configuration,", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0120: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for another user in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group3");
        res.body.should.have.property("ownerUser").and.be.equal("user3");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0130: Add a new job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user in '#USER5.1' configuration, which should be forbidden", async () => {
    const newJob = {
      ...jobUser51,
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
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id").and.be.string;
      });
  });

  it("0140: Add a new job as user5.1 himself/herself in '#USER5.1' configuration", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0150: Add a new job as user5.1 for no ownerUser and group5 ownerGroup in #USER5.1 configuration", async () => {
    const newJob = {
      ...jobUser51,
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

  it("0160: Add a new job as user5.2 for himself/herself in #USER5.1, which should be forbidden", async () => {
    const newJob = {
      ...jobUser51,
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
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("Unauthorized to create this job.");
      });
  });

  it("0170: Add a Status update to a job as a user from ADMIN_GROUPS for his/her job in 'USER5.1' configuration", async () => {
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

  it("0180: Add a Status update to a job as a user from ADMIN_GROUPS for another group's job in 'USER5.1' configuration", async () => {
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

  it("0190: Add a Status update to a job as a user from ADMIN_GROUPS for anonymous user's job in 'USER5.1' configuration", async () => {
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

  it("0200: Add a Status update to a job as a user from ADMIN_GROUPS for anonymous user's job in 'USER5.1' configuration", async () => {
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

  it("0210: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for his/her job in 'USER5.1' configuration", async () => {
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

  it("0220: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user's job in 'USER5.1' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0230: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for his/her group in 'USER5.1' configuration", async () => {
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

  it("0240: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user's group in 'USER5.1' configuration, which should be forbidden", async () => {
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

  it("0250: Add a Status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for anonymous user's group in 'USER5.1' configuration, which should be forbidden", async () => {
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

  it("0260: Add a Status update to a job as user5.1 for his/her job in 'USER5.1' configuration", async () => {
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

  it("0270: Add a Status update to a job as user5.1 for another user's job in 'USER5.1' configuration", async () => {
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

  it("0280: Add a Status update to a job as user5.1 for his/her group in 'USER5.1' configuration", async () => {
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

  it("0290: Add a Status update to a job as user5.1 for another user's group in 'USER5.1' configuration", async () => {
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

  it("0300: Add a Status update to a job as user5.1 for anonymous user's group in 'USER5.1' configuration", async () => {
    const update = {
      statusMessage: "update status of a job",
      statusCode: "job finished/blocked/etc",
      jobResultObject: {
        result: {
          datasetId: "pid",
          name: "pid.tar",
          size: 12345,
          archiveId: "/archive/pid.tar",
          url: "https://address.domain/v1/AUTH_xxxx/d1/d2/pid.tar",
        },
      },
    };
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .send(update)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("statusMessage")
          .and.equal(update.statusMessage);
        res.body.should.have
          .property("statusCode")
          .and.equal(update.statusCode);
        res.body.should.have
          .property("jobResultObject")
          .and.be.deep.equal(update.jobResultObject);
      });
  });

  it("0305: Add a Status update to a job as user5.1 for anonymous user's group in 'USER5.1' configuration changing some fields in jobResultsObject", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .set("Content-type", "application/merge-patch+json")
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
        jobResultObject: {
          result: {
            size: 54321,
            url: "https://address.domain/v1/AUTH_xxyy/d1/d2/pid.tar",
          },
        },
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("statusMessage")
          .and.equal("update status of a job");
        res.body.should.have
          .property("statusCode")
          .and.equal("job finished/blocked/etc");
        res.body.should.have.property("jobResultObject").and.be.deep.equal({
          result: {
            datasetId: "pid",
            name: "pid.tar",
            size: 54321,
            archiveId: "/archive/pid.tar",
            url: "https://address.domain/v1/AUTH_xxyy/d1/d2/pid.tar",
          },
        });
      });
  });
  it("0310: Add a Status update to a job as user5.2 for his/her job in 'USER5.1' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser52}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0320: Add a Status update to a job as user5.2 for user's 5.1 in same group job in 'USER5.1' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0330: Add a Status update to a job as user5.2 for another user in his/her group job in 'USER5.1' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0340: Access jobs as a user from ADMIN_GROUPS that were created by User5.1", async () => {
    const filter = {
      where: {
        createdBy: "user5.1",
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
        res.body.should.be.an("array").to.have.lengthOf(2);
      });
  });

  it("0350: Access jobs as a user from ADMIN_GROUPS that were created by User5.2", async () => {
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
        res.body.should.be.an("array").to.have.lengthOf(0);
      });
  });

  it("0360: Fullquery jobs as a user from ADMIN_GROUPS that were created by User5.1, limited by 1", async () => {
    const filter = {
      limits: {
        limit: 1,
      },
      where: {
        createdBy: "user5.1",
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

  it("0370: Fullquery jobs as a user from ADMIN_GROUPS that were created by User5.2", async () => {
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
        res.body.should.be.an("array").to.have.lengthOf(0);
      });
  });

  it("0380: Fullfacet jobs as a user from ADMIN_GROUPS that were created by User5.1", async () => {
    const queryFields = { createdBy: "user5.1" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(queryFields)))
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
});
