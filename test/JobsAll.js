"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser3 = null,
  accessTokenUser51 = null,
  accessTokenUser52 = null,
  accessTokenAdmin = null,
  accessTokenArchiveManager = null,

  adminEmail = null,
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
  encodedJobOwnedByGroup3 = null;

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

const jobAll = {
  type: "all_access",
};

describe("1120: Jobs: Test New Job Model Authorization for all_access jobs type", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("Job").deleteMany({});

    const loginResponseAdminIngestor = await utils.getTokenAndEmail(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });
    accessTokenAdminIngestor = loginResponseAdminIngestor.token;

    const loginResponseUser1 = await utils.getTokenAndEmail(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
    accessTokenUser1 = loginResponseUser1.token;

    const loginResponseUser3 = await utils.getTokenAndEmail(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });
    accessTokenUser3 = loginResponseUser3.token;

    const loginResponseUser51 = await utils.getTokenAndEmail(appUrl, {
      username: "user5.1",
      password: TestData.Accounts["user5.1"]["password"],
    });
    accessTokenUser51 = loginResponseUser51.token;
    const loginResponseUser52 = await utils.getTokenAndEmail(appUrl, {
      username: "user5.2",
      password: TestData.Accounts["user5.2"]["password"],
    });
    accessTokenUser52 = loginResponseUser52.token;

    const loginResponseAdmin = await utils.getTokenAndEmail(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });
    accessTokenAdmin = loginResponseAdmin.token;
    adminEmail = loginResponseAdmin.userEmail;

    const loginResponseArchiveManager = await utils.getTokenAndEmail(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
    accessTokenArchiveManager = loginResponseArchiveManager.token;
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

  it("0040: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#all' configuration with no datasets in job parameters, which should fail", async () => {
    const newJob = {
      ...jobAll,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("List of passed datasets is empty.");
      });
  });

  it("0050: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#all' configuration with not existing dataset IDs, which should fail", async () => {
    const newJob = {
      ...jobAll,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [
          { pid: "fakeID", files: [] },
          { pid: "fakeID2", files: [] },
        ],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("Datasets with pid fakeID,fakeID2 do not exist.");
      });
  });

  it("0060: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#datasetPublic' configuration with no jobParams parameter, which should fail", async () => {
    const newJob = {
      type: "all_access",
      ownerUser: "admin",
      ownerGroup: "admin",
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
      });
  });

  it("0070: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#datasetPublic' configuration with empty jobParams parameter", async () => {
    const newJob = {
      type: "all_access",
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {},
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
        res.body.should.have.property("contactEmail").and.be.equal(adminEmail);
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0080: Add a new job as a user from ADMIN_GROUPS for himself/herself in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
      ownerUser: "admin",
      ownerGroup: "admin",
      contactEmail: "test@email.scicat",
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
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(newJob.contactEmail);
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId1 = res.body["id"];
        encodedJobOwnedByAdmin = encodeURIComponent(jobId1);
      });
  });

  it("0090: Add a new job as a user from ADMIN_GROUPS for another user in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
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
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
        res.body.should.have.property("ownerUser").and.be.equal("user1");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal("user1@your.site");
        jobId2 = res.body["id"];
        encodedJobOwnedByUser1 = encodeURIComponent(jobId2);
      });
  });

  it("0100: Add a new job as a user from ADMIN_GROUPS for undefined user from another group user in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
      ownerGroup: "group1",
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
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
        res.body.should.not.have.property("ownerUser");
        res.body.should.have.property("contactEmail").to.be.equal(adminEmail);
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId3 = res.body["id"];
        encodedJobOwnedByGroup1 = encodeURIComponent(jobId3);
      });
  });

  it("0110: Add a new job as a user from ADMIN_GROUPS for anonymous user in '#all' configuration without contactEmail, which should fail", async () => {
    const newJob = {
      ...jobAll,
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal(
            "Contact email should be specified for an anonymous job.",
          );
      });
  });

  it("0120: Add a new job as a user from ADMIN_GROUPS for anonymous user in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
      contactEmail: "test@email.scicat",
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

  it("0130: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for himself/herself in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
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
      });
  });

  it("0140: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for his/her group in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
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
        res.body.should.not.have.property("ownerUser");
        res.body.should.have
          .property("contactEmail")
          .and.be.equal("user1@your.site");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0150: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for another user in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
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

  it("0160: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for another group in '#all' configuration (the user has no access to the dataset)", async () => {
    const newJob = {
      ...jobAll,
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
        res.body.should.not.have.property("ownerUser");
        res.body.should.have.property("ownerGroup").and.be.equal("group3");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId7 = res.body["id"];
        encodedJobOwnedByGroup3 = encodeURIComponent(jobId7);
      });
  });

  it("0170: Add a new job as a user from CREATE_JOB_PRIVILEGED_GROUPS for anonymous user in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
      },
      contactEmail: "test@email.scicat",
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
        res.body.should.not.have.property("ownerUser");
        res.body.should.not.have.property("ownerGroup");
        res.body.should.have
          .property("contactEmail")
          .and.be.equal("test@email.scicat");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0180: Add a new job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for anonymous user in '#all' configuration, which should be forbidden", async () => {
    const newJob = {
      ...jobAll,
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
      },
      contactEmail: "test@email.scicat",
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

  it("0190: Add a new job as a normal user for himself/herself in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPid2, files: [] }],
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

  it("0200: Add a new job as a normal user for his/her group in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
      ownerGroup: "group5",
      contactEmail: "test@email.scicat",
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
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
        res.body.should.have
          .property("contactEmail")
          .and.be.equal(newJob.contactEmail);
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        jobId5 = res.body["id"];
        encodedJobOwnedByGroup5 = encodeURIComponent(jobId5);
      });
  });

  it("0210: Add a new job as a normal user for another user in '#all' configuration, which should fail as bad request", async () => {
    const newJob = {
      ...jobAll,
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

  it("0220: Add a new job as a normal user for another group in '#all' configuration, which should fail as bad request", async () => {
    const newJob = {
      ...jobAll,
      ownerGroup: "group1",
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
          .and.be.equal(
            "Invalid new job. User needs to belong to job owner group.",
          );
      });
  });

  it("0230: Add a new job as a normal user for anonymous user in '#all' configuration, which should fail as bad request", async () => {
    const newJob = {
      ...jobAll,
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
          .and.be.equal("Invalid new job. Owner group should be specified.");
      });
  });

  it("0240: Add a new job as unauthenticated user in '#all' configuration", async () => {
    const newJob = {
      ...jobAll,
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.not.have.property("ownerUser");
        res.body.should.not.have.property("ownerGroup");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0250: Add a new job as unauthenticated user for another user in '#all' configuration, which should fail as bad request", async () => {
    const newJob = {
      ...jobAll,
      ownerGroup: "group1",
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal(
            "Invalid new job. Unauthenticated user cannot initiate a job owned by another user.",
          );
      });
  });

  it("0260: Add a status update to a job as a user from ADMIN_GROUPS for his/her job in '#all' configuration", async () => {
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

  it("0270: Add a status update to a job as a user from ADMIN_GROUPS for another user's job in '#all' configuration", async () => {
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

  it("0280: Add a status update to a job as a user from ADMIN_GROUPS for another group's job in '#all' configuration", async () => {
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

  it("0290: Add a status update to a job as a user from ADMIN_GROUPS for anonymous user's job in '#all' configuration", async () => {
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

  it("0300: Add a status update to a job as a user from CREATE_JOB_PRIVILEGED_GROUPS for anonymous user's job in '#all' configuration, which should be forbidden", async () => {
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

  it("0310: Add a status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS his/her group in '#all' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup3}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0320: Add a status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user's job in '#all' configuration", async () => {
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

  it("0330: Add a status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for admin's job in '#all' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0340: Add a status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for another user's group in '#all' configuration", async () => {
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

  it("0350: Add a status update to a job as a user from UPDATE_JOB_PRIVILEGED_GROUPS for anonymous user's group in '#all' configuration", async () => {
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

  it("0360: Add a status update to a job as a normal user for his/her job in '#all' configuration", async () => {
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

  it("0370: Add a status update to a job as a normal user for another user's job in '#all' configuration", async () => {
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

  it("0380: Add a status update to a job as a normal user for his/her group in '#all' configuration", async () => {
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

  it("0390: Add a status update to a job as a normal user for another user's group in '#all' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0400: Add a status update to a job as a normal user for anonymous user's group in '#all' configuration", async () => {
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

  it("0410: Add a status update to a job as unauthenticated user for anonymous job in '#all' configuration", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0420: Add a status update to a job as unauthenticated user for another group's job in '#all' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0430: Add a status update to a job as unauthenticated user for another user's job in '#all' configuration, which should be forbidden", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0440: Add a status update to a job as a user from ADMIN_GROUPS for his/her job in '#all' configuration with non-existing jobId, which should fail as bad request", async () => {
    return request(appUrl)
      .patch(`/api/v4/Jobs/badJobId`)
      .send({
        statusMessage: "update status of a job",
        statusCode: "job finished/blocked/etc",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0450: Access jobs as a user from ADMIN_GROUPS ", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(13);
      });
  });

  it("0460: Access jobs as a user from ADMIN_GROUPS that were created by admin", async () => {
    const query = { where: { createdBy: "admin" } };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(5);
      });
  });

  it("0470: Access jobs as a user from ADMIN_GROUPS that were created by user in CREATE_JOB_PRIVILEGED_GROUPS", async () => {
    const query = { where: { createdBy: "user1" } };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(5);
      });
  });

  it("0480: Access jobs as a user from ADMIN_GROUPS that were created by User5.1", async () => {
    const query = { where: { createdBy: "user5.1" } };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
      });
  });

  it("0490: Access jobs as a user from ADMIN_GROUPS that were created by User5.2", async () => {
    const query = { where: { createdBy: "user5.2" } };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(0);
      });
  });

  it("0500: Access jobs as a user from ADMIN_GROUPS that were created by anonymous user", async () => {
    const query = { where: { createdBy: "anonymous" } };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
      });
  });

  it("0510: Access jobs as a user from CREATE_JOB_PRIVILEGED_GROUPS ", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(13);
      });
  });

  it("0520: Access jobs as a user from CREATE_JOB_PRIVILEGED_GROUPS that were created by admin", async () => {
    const query = { where: { createdBy: "admin" } };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(5);
      });
  });

  it("0530: Access jobs as a user from CREATE_JOB_PRIVILEGED_GROUPS that were created by user1", async () => {
    const query = { where: { createdBy: "user1" } };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(5);
      });
  });

  it("0540: Access jobs as a user from UPDATE_JOB_PRIVILEGED_GROUPS", async () => {
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

  it("0550: Access jobs as a normal user", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0560: Access jobs as a normal user (user5.1) that were created by admin", async () => {
    const query = { where: { createdBy: "admin" } };
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(0);
      });
  });

  it("0570: Access jobs as another normal user (user5.2)", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser52}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0580: Access jobs as unauthenticated user, which should be forbidden", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0590: Get admin's job as user from ADMIN_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("admin");
      });
  });

  it("0600: Get user1's job as user from ADMIN_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("user1");
      });
  });

  it("0610: Get group1's job as user from ADMIN_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
      });
  });

  it("0620: Get admin's job as user from ADMIN_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
      });
  });

  it("0630: Get admin's job as user from CREATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("admin");
      });
  });

  it("0640: Get his/her own job as user from CREATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("user1");
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
      });
  });

  it("0650: Get a job from his/her own group as user from CREATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
      });
  });

  it("0660: Get other user's job as user from CREATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("user5.1");
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
      });
  });

  it("0670: Get anonymous user's job as user from CREATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
        res.body.should.not.have.property("ownerGroup");
        res.body.should.have
          .property("contactEmail")
          .and.be.equal("test@email.scicat");
      });
  });

  it("0680: Get admin's job as user from UPDATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("admin");
      });
  });

  it("0690: Get his/her own job as user from UPDATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("user1");
        res.body.should.have.property("ownerGroup").and.be.equal("group1");
      });
  });

  it("0700: Get a job from his/her own group as user from UPDATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup3}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
        res.body.should.have.property("ownerGroup").and.be.equal("group3");
      });
  });

  it("0710: Get other user's job as user from UPDATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("user5.1");
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
      });
  });

  it("0720: Get anonymous user's job as user from UPDATE_JOB_GROUP", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
        res.body.should.not.have.property("ownerGroup");
        res.body.should.have
          .property("contactEmail")
          .and.be.equal("test@email.scicat");
      });
  });

  it("0730: Get admin's job as normal user, which should be forbidden", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
      });
  });

  it("0740: Get other user's job as normal user, which should be forbidden", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
      });
  });

  it("0750: Get his/her own job as normal user", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("ownerUser").and.be.equal("user5.1");
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
      });
  });

  it("0760: Get anonymous user's job as normal user, which should be forbidden", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
      });
  });

  it("0770: Get anonymous user's job as anonymous user, which should be forbidden", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAnonym}`)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("ownerUser");
      });
  });

  it("0780: Delete job created by admin as Archive Manager", async () => {
    return request(appUrl)
      .delete("/api/v4/jobs/" + encodedJobOwnedByAdmin)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0790: Delete job created by admin as Admin", async () => {
    return request(appUrl)
      .delete("/api/v4/jobs/" + encodedJobOwnedByUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0800: Delete job created by admin as CREATE_JOB_PRIVILEGED_GROUPS user, which should be forbidden", async () => {
    return request(appUrl)
      .delete("/api/v4/jobs/" + encodedJobOwnedByGroup1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.DeleteForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0810: Delete job created by admin as normal user, which should be forbidden", async () => {
    return request(appUrl)
      .delete("/api/v4/jobs/" + encodedJobOwnedByGroup1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.DeleteForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0820: Delete job not existing in database as Archive Manager, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v4/jobs/" + "fakeJobId")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0830: Access jobs as a user from ADMIN_GROUPS, which should be one less than before proving that delete works.", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(11);
      });
  });

  it("0840: Fullquery jobs as a user from ADMIN_GROUPS, limited by 2", async () => {
    const filter = {
      limits: {
        limit: 2,
      },
    };

    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .set("Accept", "application/json")
      .query({ filter: JSON.stringify(filter) })
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
      });
  });

  it("0850: Fullquery jobs as a user from ADMIN_GROUPS that were created by admin", async () => {
    // same as in get before, but the two were deleted
    const filter = {
      where: {
        createdBy: "admin",
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
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0860: Fullquery jobs as a user from ADMIN_GROUPS that were created by user1", async () => {
    const filter = {
      where: {
        createdBy: "user1",
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
        res.body.should.be.an("array").to.have.lengthOf(5);
      });
  });

  it("0870: Fullquery jobs as a user from ADMIN_GROUPS that were created by anonymous user", async () => {
    const filter = {
      limits: {
        limit: 2,
      },
      where: {
        createdBy: "anonymous",
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

  it("0880: Fullquery jobs as a user from CREATE_JOB_PRIVILEGED_GROUPS that were created by admin", async () => {
    const filter = {
      where: {
        createdBy: "admin",
      },
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0890: Fullquery jobs as a user from CREATE_JOB_PRIVILEGED_GROUPS that were created by user1", async () => {
    const filter = {
      where: {
        createdBy: "user1",
      },
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(5);
      });
  });

  it("0900: Fullquery jobs as a user from UPDATE_JOB_PRIVILEGED_GROUPS that were created by admin", async () => {
    const filter = {
      where: {
        createdBy: "admin",
      },
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0910: Fullquery jobs as a user from UPDATE_JOB_PRIVILEGED_GROUPS that were created by user1", async () => {
    const filter = {
      where: {
        createdBy: "user1",
      },
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(5);
      });
  });

  it("0920: Fullquery jobs as a normal user", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
      });
  });

  it("0930: Fullquery jobs as a normal user (user5.1) that were created by admin", async () => {
    const filter = {
      where: {
        createdBy: "admin",
      },
    };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(0);
      });
  });

  it("0940: Fullquery jobs as unauthenticated user, which should be forbidden", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/fullquery`)
      .send({})
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0950: Fullfacet jobs as unauthenticated user, which should be forbidden", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0960: Fullfacet jobs as a user from ADMIN_GROUPS that were created by admin", async () => {
    const query = { createdBy: "admin" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 3 }] });
      });
  });

  it("0970: Fullfacet jobs as a user from ADMIN_GROUPS that were created by user1", async () => {
    const query = { createdBy: "user1" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 5 }] });
      });
  });

  it("0980: Fullfacet jobs as a user from ADMIN_GROUPS that were created by anonymous user", async () => {
    const query = { createdBy: "anonymous" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
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

  it("0990: Fullfacet jobs as a user from CREATE_JOB_PRIVILEGED_GROUPS that were created by admin", async () => {
    const query = { createdBy: "admin" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 3 }] });
      });
  });

  it("1000: Fullfacet jobs as a user from CREATE_JOB_PRIVILEGED_GROUPS that were created by user1", async () => {
    const query = { createdBy: "user1" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 5 }] });
      });
  });

  it("1010: Fullfacet jobs as a user from UPDATE_JOB_PRIVILEGED_GROUPS that were created by admin", async () => {
    const query = { createdBy: "admin" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 3 }] });
      });
  });

  it("1020: Fullfacet jobs as a user from UPDATE_JOB_PRIVILEGED_GROUPS that were created by user1", async () => {
    const query = { createdBy: "user1" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser3}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 5 }] });
      });
  });

  it("1030: Fullfacet jobs as a normal user", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 3 }] });
      });
  });

  it("1040: Fullfacet jobs as a normal user (user5.1) that were created by admin", async () => {
    const query = { createdBy: "admin" };
    return request(appUrl)
      .get(`/api/v4/Jobs/fullfacet`)
      .send({})
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").that.deep.contains({ all: [] });
      });
  });
});
