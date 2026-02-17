"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenAdmin = null,
  accessTokenUser51 = null,
  accessTokenUser2 = null,

  datasetPid1 = null,
  datasetPid2 = null,
  datablockId1 = null,
  datablockId2 = null,
  datablockId3 = null,
  datablockId4 = null,
  datablockId5 = null,
  origDatablock1 = null,

  jobId = null,
  encodedJob = null,
  encodedJobOwnedByAdmin = null,
  encodedJobOwnedByGroup5 = null,
  encodedJobOwnedByUser51 = null,
  encodedJobAnonymous = null,

  jobCreateDtoByAdmin = null,
  jobCreateDtoForUser51 = null,
  jobCreateDtoByUser1 = null,
  jobCreateDtoByAnonymous = null,
  jobUpdateDto1 = null,
  jobUpdateDto2 = null;

const dataset1 = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "group5",
  accessGroups: ["group1"],
};

const dataset2 = {
  ...TestData.RawCorrect,
  isPublished: true,
  ownerGroup: "group5",
  accessGroups: ["group1"],
};

const jobOwnerAccess = {
  type: "owner_access",
};
const jobDatasetPublic = {
  type: "public_access",
};
const jobDatasetAccess = {
  type: "dataset_access",
};

describe("1191: Jobs: Test Backwards Compatibility", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("Datablock").deleteMany({});
    db.collection("Job").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });

    accessTokenUser51 = await utils.getToken(appUrl, {
      username: "user5.1",
      password: TestData.Accounts["user5.1"]["password"],
    });

    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts["user2"]["password"],
    });
  });

  after(() => {
    db.collection("Dataset").deleteMany({});
    db.collection("Datablock").deleteMany({});
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
        res.body.should.have.property("ownerGroup").and.equal("group5");
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("isPublished").and.equal(false);
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
        res.body.should.have.property("ownerGroup").and.equal("group5");
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("isPublished").and.equal(true);
        res.body.should.have.property("pid").and.be.string;
        datasetPid2 = res.body["pid"];
      });
  });

  it("0021: Add via /api/v3 a new job with invalid type, as a user from ADMIN_GROUPS, which should fail", async () => {
    const newJob = {
      type: "invalid_type",
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("Invalid job type: invalid_type");
      });
  });

  it("0022: Add via /api/v3 a new job without type, as a user from ADMIN_GROUPS, which should fail", async () => {
    const newJob = {
      datasetList: [{ pid: datasetPid1, files: [] }],
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("Invalid job type: undefined");
      });
  });

  it("0030: Add via /api/v3 a new job without datasetList, as a user from ADMIN_GROUPS, which should fail", async () => {
    const newJob = {
      ...jobOwnerAccess,
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
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

  it("0040: Add via /api/v3 a new job ignoring datasetList from jobParams, as a user from ADMIN_GROUPS, which should fail", async () => {
    const newJob = {
      ...jobOwnerAccess,
      datasetList: [{ pid: "test", files: [] }],
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: [] }],
      },
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("Datasets with pid test do not exist.");
      });
  });

  it("0050: Add via /api/v3 an anonymous job with custom jobStatusMessage, as a user from ADMIN_GROUPS", async () => {
    jobCreateDtoByAdmin = {
      ...jobDatasetPublic,
      datasetList: [{ pid: datasetPid1, files: [] }],
      jobStatusMessage: "custom_message"
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoByAdmin)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("custom_message");
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoByAdmin.datasetList);
        res.body.should.have.property("jobParams").that.deep.equals(
          { username: TestData.Accounts["admin"]["username"] }
        );
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(TestData.Accounts["admin"]["email"]);
        res.body.should.not.have.property("ownerUser");
        res.body.should.not.have.property("executionTime");
        encodedJobOwnedByAdmin = encodeURIComponent(res.body["id"]);
      });
  });

  it("0060: Get via /api/v4 the anonymous job as a user from ADMIN_GROUPS, which now belongs to that logged in admin user", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("createdAt");
        res.body.should.not.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.have.property("ownerUser").to.be.equal("admin");
        res.body.should.not.have.property("ownerGroup");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(TestData.Accounts["admin"]["email"]);
        res.body.should.have.property("statusCode").to.be.equal("custom_message");
        res.body.should.have
          .property("statusMessage")
          .to.be.equal("custom_message");
        res.body.should.have
          .property("jobParams")
          .that.deep.equals({ datasetList: jobCreateDtoByAdmin.datasetList });
      });
  });

  it("0070: Get via /api/v3 the anonymous job as user5.1, which should fail", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/${encodedJobOwnedByAdmin}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
      });
  });

  it("0080: Get via /api/v4 the anonymous job as user5.1, which should fail", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
      });
  });

  it("0090: Add via /api/v3 a new job with emailJobInitiator for user5.1 in #datasetOwner auth, as a user from ADMIN_GROUPS", async () => {
    jobCreateDtoForUser51 = {
      ...jobOwnerAccess,
      emailJobInitiator: "user5.1@your.site",
      datasetList: [{ pid: datasetPid1, files: [] }],
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoForUser51)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("jobSubmitted");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoForUser51.emailJobInitiator);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoForUser51.datasetList);
        res.body.should.have.property("jobParams").that.deep.equals(
          { username: TestData.Accounts["admin"]["username"] }
        );
        encodedJobOwnedByGroup5 = encodeURIComponent(res.body["id"]);
      });
  });

  it("0093: Add via /api/v3 a new job with with files matching origs", async () => {
    jobCreateDtoForUser51 = {
      ...jobOwnerAccess,
      emailJobInitiator: "user5.1@your.site",
      datasetList: [{ pid: datasetPid1, files: [TestData.OrigDatablockV4MinCorrect.dataFileList[0].path] }],
    };

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid1,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        origDatablock1 = res.body._id;
      });

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoForUser51)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("jobSubmitted");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoForUser51.emailJobInitiator);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoForUser51.datasetList);
        res.body.should.have.property("jobParams").that.deep.equals(
          { username: TestData.Accounts["admin"]["username"] }
        );
        encodedJobOwnedByGroup5 = encodeURIComponent(res.body["id"]);
      });
  });

  it("0096: Add via /api/v3 a new job with with files non matching origs", async () => {
    jobCreateDtoForUser51 = {
      ...jobOwnerAccess,
      emailJobInitiator: "user5.1@your.site",
      datasetList: [{ pid: datasetPid1, files: ['abcdef.ghi'] }],
    };

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid1,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        origDatablock1 = res.body._id;
      });

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoForUser51)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("At least one requested file could not be found.");
      });
  });

  it("0100: Get via /api/v4 the job added for user5.1, as a user from ADMIN_GROUPS", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("createdAt");
        res.body.should.not.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        res.body.should.have
          .property("statusMessage")
          .to.be.equal("Job submitted.");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(jobCreateDtoForUser51.emailJobInitiator);
        res.body.should.have.property("ownerUser").to.be.equal("admin");
        res.body.should.have.property("ownerGroup").to.be.equal("group5");
      });
  });

  it("0110: Get via /api/v4 the job added for user5.1, as user5.1, which passes because group5 was added to ownerGroup", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("ownerUser").to.be.equal("admin");
        res.body.should.have.property("ownerGroup").to.be.equal("group5");
      });
  });

  it("0120: Get via /api/v3 the job added for user5.1, as user5.1, which passes because group5 was added to ownerGroup", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.not.have.property("ownerUser");
        res.body.should.not.have.property("ownerGroup");
      });
  });

  it("0130: Add via /api/v3 a new job with a complete dto for user5.1 and other contactEmail, as a user from ADMIN_GROUPS", async () => {
    jobCreateDtoForUser51 = {
      ...jobOwnerAccess,
      emailJobInitiator: "test@email.scicat",
      jobParams: {
        param: "ok",
        username: "user5.1",
      },
      datasetList: [{ pid: datasetPid1, files: [] }],
      executionTime: "2030-01-01T00:00:00.000Z",
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoForUser51)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("executionTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("jobSubmitted");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoForUser51.emailJobInitiator);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoForUser51.datasetList);
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(jobCreateDtoForUser51.jobParams);
        encodedJobOwnedByGroup5 = encodeURIComponent(res.body["id"]);
      });
  });

  it("0140: Get via /api/v4 the job added for user5.1, as a user from ADMIN_GROUPS", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const expectedJobParams = {
          datasetList: jobCreateDtoForUser51.datasetList,
          param: jobCreateDtoForUser51.jobParams.param,
          username: jobCreateDtoForUser51.jobParams.username,
          executionTime: jobCreateDtoForUser51.executionTime,
        };
        res.body.should.have.property("id");
        res.body.should.have.property("createdAt");
        res.body.should.not.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        res.body.should.have
          .property("statusMessage")
          .to.be.equal("Job submitted.");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(jobCreateDtoForUser51.emailJobInitiator);
        res.body.should.have
          .property("ownerUser")
          .to.be.equal(expectedJobParams.username);
        res.body.should.have.property("ownerGroup");
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(expectedJobParams);
      });
  });

  it("0150: Get via /api/v4 the job added for user5.1, as user5.1", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const expectedJobParams = {
          datasetList: jobCreateDtoForUser51.datasetList,
          param: jobCreateDtoForUser51.jobParams.param,
          username: jobCreateDtoForUser51.jobParams.username,
          executionTime: jobCreateDtoForUser51.executionTime,
        };
        res.body.should.have.property("id");
        res.body.should.have.property("createdAt");
        res.body.should.not.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        res.body.should.have
          .property("statusMessage")
          .to.be.equal("Job submitted.");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(jobCreateDtoForUser51.emailJobInitiator);
        res.body.should.have
          .property("ownerUser")
          .to.be.equal(expectedJobParams.username);
        res.body.should.have.property("ownerGroup");
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(expectedJobParams);
      });
  });

  it("0160: Get via /api/v3 the job added for user5.1, as user5.1", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoForUser51.emailJobInitiator);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoForUser51.datasetList);
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(jobCreateDtoForUser51.jobParams);
      });
  });

  it("0170: Add via /api/v3 a new job without specifying username for user5.1, as user5.1, which passes because of logged in user", async () => {
    jobCreateDtoByUser1 = {
      ...jobOwnerAccess,
      jobParams: {
        param: "ok",
      },
      datasetList: [{ pid: datasetPid1, files: [] }],
      executionTime: "2030-01-01T00:00:00.000Z",
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoByUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
      });
  });

  it("0180: Add via /api/v3 a new job specifying only emailJobInitiator for user5.1, as user5.1, which passes because of logged in user", async () => {
    jobCreateDtoByUser1 = {
      ...jobOwnerAccess,
      emailJobInitiator: "user51@your.site",
      jobParams: {
        param: "ok",
      },
      datasetList: [{ pid: datasetPid1, files: [] }],
      executionTime: "2030-01-01T00:00:00.000Z",
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoByUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
      });
  });

  it("0190: Add via /api/v3 a new job with complete dto for user5.1, as user5.1", async () => {
    jobCreateDtoByUser1 = {
      ...jobOwnerAccess,
      emailJobInitiator: "test@email.scicat",
      jobParams: {
        param: "ok",
        username: "user5.1",
      },
      datasetList: [{ pid: datasetPid1, files: [] }],
      executionTime: "2030-01-01T00:00:00.000Z",
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoByUser1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("executionTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("jobSubmitted");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoByUser1.emailJobInitiator);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoByUser1.datasetList);
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(jobCreateDtoByUser1.jobParams);
        encodedJobOwnedByGroup5 = encodeURIComponent(res.body["id"]);
      });
  });

  it("0200: Get via /api/v4 the job added for user5.1, as user5.1", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const expectedJobParams = {
          datasetList: jobCreateDtoByUser1.datasetList,
          param: jobCreateDtoByUser1.jobParams.param,
          username: jobCreateDtoByUser1.jobParams.username,
          executionTime: jobCreateDtoByUser1.executionTime,
        };
        res.body.should.have.property("id");
        res.body.should.have.property("createdAt");
        res.body.should.not.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        res.body.should.have
          .property("statusMessage")
          .to.be.equal("Job submitted.");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(jobCreateDtoByUser1.emailJobInitiator);
        res.body.should.have
          .property("ownerUser")
          .to.be.equal(expectedJobParams.username);
        res.body.should.have.property("ownerGroup");
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(expectedJobParams);
      });
  });

  it("0210: Get via /api/v3 the job added for user5.1, as user5.1", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("executionTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("jobSubmitted");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoByUser1.emailJobInitiator);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoByUser1.datasetList);
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(jobCreateDtoByUser1.jobParams);
      });
  });

  it("0220: Add a status update via /api/v3 without jobStatusMessage to a job, as a user from ADMIN_GROUPS", async () => {
    jobUpdateDto1 = {
      executionTime: "2045-01-01T00:00:00.000Z",
      jobResultObject: {
        resultParam: "ok",
      },
    };

    return request(appUrl)
      .patch(`/api/v3/Jobs/${encodedJobOwnedByAdmin}`)
      .send(jobUpdateDto1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal(jobCreateDtoByAdmin.jobStatusMessage);
        res.body.should.have
          .property("executionTime")
          .to.be.equal(jobUpdateDto1.executionTime);
        res.body.should.have
          .property("jobResultObject")
          .that.deep.equals(jobUpdateDto1.jobResultObject);
      });
  });

  it("0230: Add a status update via /api/v3 to a job as a user from ADMIN_GROUPS for his/her job", async () => {
    jobUpdateDto1 = {
      jobStatusMessage: "newJobStatus",
      executionTime: "2045-01-01T00:00:00.000Z",
      jobResultObject: {
        resultParam: "ok",
      },
    };

    return request(appUrl)
      .patch(`/api/v3/Jobs/${encodedJobOwnedByAdmin}`)
      .send(jobUpdateDto1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal(jobUpdateDto1.jobStatusMessage);
        res.body.should.have
          .property("executionTime")
          .to.be.equal(jobUpdateDto1.executionTime);
        res.body.should.have
          .property("jobResultObject")
          .that.deep.equals(jobUpdateDto1.jobResultObject);
      });
  });

  it("0240: Get via /api/v4 the previously updated job as a user from ADMIN_GROUPS", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByAdmin}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const expectedJobParams = {
          datasetList: jobCreateDtoByAdmin.datasetList,
          executionTime: jobUpdateDto1.executionTime,
        };
        res.body.should.have.property("id");
        res.body.should.have.property("createdAt");
        res.body.should.not.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.have
          .property("statusCode")
          .to.be.equal(jobUpdateDto1.jobStatusMessage);
        res.body.should.have
          .property("statusMessage")
          .to.be.equal(jobUpdateDto1.jobStatusMessage);
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(expectedJobParams);
        res.body.should.have
          .property("jobResultObject")
          .that.deep.equals(jobUpdateDto1.jobResultObject);
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(TestData.Accounts["admin"]["email"]);
      });
  });

  it("0250: Add a status update via /api/v4 to a job that was created via /api/v3, as user5.1 for his/her job", async () => {
    jobUpdateDto2 = {
      statusCode: "statusCode",
      statusMessage: "statusMessage",
      jobResultObject: {
        newParam: "test",
      },
    };

    return request(appUrl)
      .patch(`/api/v4/Jobs/${encodedJobOwnedByGroup5}`)
      .send(jobUpdateDto2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        const expectedJobParams = {
          datasetList: jobCreateDtoByUser1.datasetList,
          param: jobCreateDtoByUser1.jobParams.param,
          username: jobCreateDtoByUser1.jobParams.username,
          executionTime: jobCreateDtoByUser1.executionTime,
        };
        res.body.should.have.property("id");
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.have.property("type").and.be.string;
        res.body.should.not.have.property("creationTime");
        res.body.should.not.have.property("executionTime");
        res.body.should.not.have.property("datasetList");
        res.body.should.have
          .property("statusCode")
          .to.be.equal(jobUpdateDto2.statusCode);
        res.body.should.have
          .property("statusMessage")
          .to.be.equal(jobUpdateDto2.statusMessage);
        res.body.should.have
          .property("jobResultObject")
          .that.deep.equals(jobUpdateDto2.jobResultObject);
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(expectedJobParams);
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(jobCreateDtoByUser1.emailJobInitiator);
        res.body.should.have
          .property("ownerUser")
          .to.be.equal(expectedJobParams.username);
        res.body.should.have.property("ownerGroup");
      });
  });

  it("0260: Get via /api/v3 the job that was previously updated via /api/v4, as user5.1 for his/her job", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/${encodedJobOwnedByGroup5}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoByUser1.emailJobInitiator);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoByUser1.datasetList);
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(jobCreateDtoByUser1.jobParams);
        res.body.should.have
          .property("executionTime")
          .to.be.equal(jobCreateDtoByUser1.executionTime);
        res.body.should.have
          .property("jobResultObject")
          .that.deep.equals(jobUpdateDto2.jobResultObject);
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal(jobUpdateDto2.statusCode);
      });
  });

  it("0270: Get via /api/v3 all accessible jobs as user5.1", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(6);
        res.body.forEach(result =>
          result.should.have.contain.keys(["type", "emailJobInitiator"])
        )
      });
  });

  it("0275: Get via /api/v3 all accessible jobs as user5.1", async () => {
    const filter = { fields: ["emailJobInitiator"] }
    return request(appUrl)
      .get(`/api/v3/Jobs/?filter=${encodeURIComponent(JSON.stringify(filter))}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(6);
        res.body.forEach(result => {
          result.should.have.property("emailJobInitiator");
          result.should.not.have.property("type")
        });
      });
  });

  it("0280: Get via /api/v3 all accessible jobs as a user from ADMIN_GROUPS", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(7);
      });
  });

  it("0290: Fullquery via /api/v3 all jobs that were created by user5.1, as user5.1", async () => {
    const query = { createdBy: "user5.1" };
    return request(appUrl)
      .get(`/api/v3/Jobs/fullquery`)
      .set("Accept", "application/json")
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
        const dates = res.body.map(result => new Date(result.creationTime));
        (dates[0] < dates[1] && dates[1] < dates[2]).should.be.true;
      });
  });

  it("0293: Fullquery via /api/v3 all jobs that were created by user5.1, as user5.1 and ordered by creationTime", async () => {
    const query = { createdBy: "user5.1" };
    const limits = { order: "creationTime:desc" }
    return request(appUrl)
      .get(`/api/v3/Jobs/fullquery`)
      .set("Accept", "application/json")
      .query(`fields=${encodeURIComponent(JSON.stringify(query))}&limits=${encodeURIComponent(JSON.stringify(limits))}`)
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(3);
        const dates = res.body.map(result => new Date(result.creationTime));
        (dates[0] > dates[1] && dates[1] > dates[2]).should.be.true;
      });
  });

  it("0296: Fullquery via /api/v3 all jobs that were created by user5.1, as user5.1 and ordered by creationTime", async () => {
    const query = { createdBy: "user5.1", emailJobInitiator: "test@email.scicat" };
    return request(appUrl)
      .get(`/api/v3/Jobs/fullquery`)
      .set("Accept", "application/json")
      .query(`fields=${encodeURIComponent(JSON.stringify(query))}`)
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0].should.have.property("emailJobInitiator").and.equal("test@email.scicat");
      });
  });

  it("0300: Fullfacet via /api/v3 jobs that were created by admin, as a user from ADMIN_GROUPS", async () => {
    const query = { createdBy: "admin" };
    return request(appUrl)
      .get(`/api/v3/Jobs/fullfacet`)
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be
          .an("array")
          .that.deep.contains({ all: [{ totalSets: 4 }] });
      });
  });

  it("0310: Fullfacet via /api/v3 jobs that were created by user5.1, as a user from ADMIN_GROUPS", async () => {
    const query = { createdBy: "user5.1" };
    return request(appUrl)
      .get(`/api/v3/Jobs/fullfacet`)
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

  it("0315: Fullfacet via /api/v3 jobs that were created by user5.1, as a user from ADMIN_GROUPS with fields and facets", async () => {
    const query = { createdBy: "user5.1", emailJobInitiator: "test@email.scicat" };
    return request(appUrl)
      .get(`/api/v3/Jobs/fullfacet`)
      .query("fields=" + encodeURIComponent(JSON.stringify(query)))
      .query("facets=" + encodeURIComponent(JSON.stringify([])))
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

  it("0320: Delete via /api/v3 a job created by admin, as a user from ADMIN_GROUPS", async () => {
    return request(appUrl)
      .delete("/api/v3/Jobs/" + encodedJobOwnedByAdmin)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0330: Get via /api/v3 all accessible jobs as a user from ADMIN_GROUPS, which should be one less than before, proving that delete works", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(6);
      });
  });

  it("0340: Add via /api/v3 a job while logged in as user5.1", async () => {
    const newJob = {
      ...jobOwnerAccess,
      datasetList: [{ pid: datasetPid1, files: [] }],
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(TestData.Accounts["user5.1"]["email"]);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(newJob.datasetList);
        encodedJobOwnedByUser51 = encodeURIComponent(res.body["id"]);
      });
  });

  it("0350: Get via /api/v4 the job created by logged in user5.1", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("ownerUser").to.be.equal("user5.1");
        res.body.should.have
          .property("ownerGroup")
          .to.be.equal(TestData.Accounts["user5.1"]["role"]);
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(TestData.Accounts["user5.1"]["email"]);
      });
  });

  it("0360: Add via /api/v3 a job for another user, as user5.1, which should fail", async () => {
    const newJob = {
      ...jobOwnerAccess,
      datasetList: [{ pid: datasetPid1, files: [] }],
      jobParams: {
        username: "user2",
      },
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.BadRequestStatusCode)
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

  it("0370: Add a new job as anonymous user with all published datasets", async () => {
    jobCreateDtoByAnonymous = {
      ...jobDatasetPublic,
      emailJobInitiator: "user5.1@your.site",
      datasetList: [{ pid: datasetPid2, files: [] }],
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoByAnonymous)
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("jobSubmitted");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoByAnonymous.emailJobInitiator);
        encodedJobAnonymous = encodeURIComponent(res.body["id"]);
      });
  });

  it("0380: Get via /api/v4 the anonymous job as a user from ADMIN_GROUPS", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobAnonymous}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("createdAt");
        res.body.should.not.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.not.have.property("ownerUser");
        res.body.should.not.have.property("ownerGroup");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(jobCreateDtoByAnonymous.emailJobInitiator);
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        res.body.should.have
          .property("statusMessage")
          .to.be.equal("Job submitted.");
        res.body.should.have.property("jobParams").that.deep.equals({
          datasetList: jobCreateDtoByAnonymous.datasetList,
        });
      });
  });

  it("0390: Get via /api/v3 the anonymous job as user5.1, which should fail", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/${encodedJobAnonymous}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
      });
  });

  it("0400: Get via /api/v3 the anonymous job as the normal user in its contactEmail, which should fail", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/${encodedJobAnonymous}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
      });
  });

  it("0410: Get via /api/v3 the anonymous job as a user in CREATE_JOB_PRIVILEGED_GROUPS", async () => {
    return request(appUrl)
      .get(`/api/v3/Jobs/${encodedJobAnonymous}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
      });
  });

  it("0420: Add via /api/v3 a new job for user5.1, as user5.1 in #datasetAccess auth", async () => {
    const newJob = {
      ...jobDatasetAccess,
      jobParams: {
        param: "ok",
        username: TestData.Accounts["user5.1"]["username"]
      },
      datasetList: [{ pid: datasetPid1, files: [] }],
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("jobSubmitted");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(TestData.Accounts["user5.1"]["email"]);
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(newJob.datasetList);
        res.body.should.have
          .property("jobParams")
          .that.deep.equals(newJob.jobParams);
        encodedJobOwnedByUser51 = encodeURIComponent(res.body["id"]);
      });
  });

  it("0430: Get via /api/v4 the previously added job, as user5.1", async () => {
    return request(appUrl)
      .get(`/api/v4/Jobs/${encodedJobOwnedByUser51}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("createdAt");
        res.body.should.not.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("configVersion").and.be.string;
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
        res.body.should.have
          .property("statusMessage")
          .to.be.equal("Job submitted.");
        res.body.should.have
          .property("contactEmail")
          .to.be.equal(TestData.Accounts["user5.1"]["email"]);
        res.body.should.have.property("ownerUser").to.be.equal("user5.1");
        res.body.should.have.property("ownerGroup").to.be.equal("group5");
      });
  });

  it("0440: Add via /api/v3 an anonymous job with custom jobStatusMessage, as a user from ADMIN_GROUPS: adminingestor", async () => {
    jobCreateDtoByAdmin = {
      ...jobDatasetPublic,
      datasetList: [{ pid: datasetPid1, files: [] }],
      jobStatusMessage: "custom_message"
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoByAdmin)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("creationTime");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("custom_message");
        res.body.should.have
          .property("datasetList")
          .that.deep.equals(jobCreateDtoByAdmin.datasetList);
        res.body.should.have.property("jobParams").that.deep.equals(
          { username: TestData.Accounts["adminIngestor"]["username"] }
        );
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(TestData.Accounts["adminIngestor"]["email"]);
        res.body.should.not.have.property("ownerUser");
        res.body.should.not.have.property("executionTime");
        encodedJobOwnedByAdmin = encodeURIComponent(res.body["id"]);
      });
  });

  it("0450: Add via /api/v3 a new job for user5.1, as user5.1 in #datasetAccess auth with wrong identity", async () => {
    const user5 = TestData.Accounts["user5.1"]["username"]
    const newJob = {
      ...jobDatasetAccess,
      jobParams: {
        param: "ok",
        username: user5
      },
      datasetList: [{ pid: datasetPid1, files: [] }],
    };

    const userIdentity = await db.collection("UserIdentity").findOne({ "profile.username": user5 })
    userIdentity.profile.accessGroups = ["someOtherGroup"];
    delete userIdentity._id;
    userIdentity.created = new Date();
    const userIdentity2 = await db.collection("UserIdentity").insertOne(userIdentity);
    await db.collection("UserIdentity").countDocuments({ "profile.username": user5 })
      .then((count) => {
        count.should.equal(2);
      });

    try {
      await request(appUrl)
        .post("/api/v3/Jobs")
        .send(newJob)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenUser51}` })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
    } finally {
      await db.collection("UserIdentity").deleteOne({ _id: userIdentity2.insertedId })
    };
  });

  it("0460: Add a new job as auth user with all published datasets", async () => {
    jobCreateDtoByAnonymous = {
      ...jobDatasetAccess,
      emailJobInitiator: "user2@your.site",
      datasetList: [{ pid: datasetPid2, files: [] }],
    };

    return request(appUrl)
      .post("/api/v3/Jobs")
      .send(jobCreateDtoByAnonymous)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id");
        res.body.should.have.property("type").and.be.string;
        res.body.should.have
          .property("jobStatusMessage")
          .to.be.equal("jobSubmitted");
        res.body.should.have
          .property("emailJobInitiator")
          .to.be.equal(jobCreateDtoByAnonymous.emailJobInitiator);
        encodedJobAnonymous = encodeURIComponent(res.body["id"]);
      });
  });

  describe("1192: Jobs: Test datasetDetails backwards Compatibility", () => {
    before(async () => {
      const newJob = {
        ...jobOwnerAccess,
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [
            { pid: datasetPid1, files: [] },
            { pid: datasetPid2, files: [] },
          ],
        },
      };

      await request(appUrl)
        .post("/api/v4/Jobs")
        .send(newJob)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          jobId = res.body["id"];
          encodedJob = encodeURIComponent(jobId);
        });

      await request(appUrl)
        .post(`/api/v3/datasets/${encodeURIComponent(datasetPid1)}/datablocks`)
        .send(TestData.DataBlockCorrect)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          datablockId1 = res.body.id;
        });

      const dataBlock1 = {
        ...TestData.DataBlockCorrect,
        archiveId: "id2",
        size: 200,
      };
      await request(appUrl)
        .post(`/api/v3/datasets/${encodeURIComponent(datasetPid1)}/datablocks`)
        .send(dataBlock1)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          datablockId2 = res.body.id;
        });

      const dataBlock2 = {
        ...TestData.DataBlockCorrect,
        archiveId: "id3",
        size: 300,
      };
      await request(appUrl)
        .post(`/api/v3/datasets/${encodeURIComponent(datasetPid2)}/datablocks`)
        .send(dataBlock2)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          datablockId3 = res.body.id;
        });

      const dataBlock3 = {
        ...TestData.DataBlockCorrect,
        archiveId: "id4",
        size: 400,
      };
      await request(appUrl)
        .post(`/api/v3/datasets/${encodeURIComponent(datasetPid2)}/datablocks`)
        .send(dataBlock3)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          datablockId4 = res.body.id;
        });

      const dataBlock4 = {
        ...TestData.DataBlockCorrect,
        archiveId: "id5",
        size: 500,
      };
      await request(appUrl)
        .post(`/api/v3/datasets/${encodeURIComponent(datasetPid2)}/datablocks`)
        .send(dataBlock4)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          datablockId5 = res.body.id;
        });
    });

    it("0010: Get job and details on dataset for specific jobID and including information on datasets and datablocks as a user from ADMIN_GROUP with v4 endpoint", async () => {
      const query = {
        where: { id: encodedJob },
        fields: [
          "datasetDetails.pid",
          "datasetDetails.owner",
          "datasetDetails.contactEmail",
          "datasetDetails.sourceFolder",
          "datasetDetails.type",
          "datasetDetails.classification",
          "datasetDetails.ownerGroup",
          "datasetDetails.datasetlifecycle",
          "datasetDetails.datablocks.archiveId",
          "datasetDetails.datablocks.size",
          "datasetDetails.datablocks._id",
        ],
      };

      return request(appUrl)
        .get(`/api/v4/Jobs/datasetDetails`)
        .send({})
        .query({ filter: JSON.stringify(query) })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array").to.have.lengthOf(1);
          const j = res.body[0];
          j.should.include.keys(["datasetDetails"]);
          j.datasetDetails.should.be.an("array").to.have.lengthOf(2);
          const ds1 = j.datasetDetails.find((d) => d.pid === datasetPid1);
          const ds2 = j.datasetDetails.find((d) => d.pid === datasetPid2);
          ds1.should.have
            .property("datablocks")
            .that.is.an("array")
            .with.lengthOf(2);
          ds1.datablocks
            .map((db) => db._id)
            .should.include.members([datablockId1, datablockId2]);
          ds2.should.have
            .property("datablocks")
            .that.is.an("array")
            .with.lengthOf(3);
          ds2.datablocks
            .map((db) => db._id)
            .should.include.members([datablockId3, datablockId4, datablockId5]);
        });
    });

    it("0020: Should return dataset details from V3 endpoint for a specific job and include datablocks information as a user from ADMIN_GROUP", async () => {
      const dsFields = {
        pid: true,
        sourceFolder: true,
        sourceFolderHost: true,
        contactEmail: true,
        owner: true,
        ownerGroup: true,
        classification: true,
        type: true,
        datasetlifecycle: true,
        createdBy: true,
      };
      const rFields = {
        _id: true,
        archiveId: true,
        size: true,
        datasetId: true,
      };
      return request(appUrl)
        .get(`/api/v3/Jobs/datasetDetails`)
        .send({})
        .query("jobId=" + encodedJob)
        .query("datasetFields=" + encodeURIComponent(JSON.stringify(dsFields)))
        .query(
          "include=" +
          encodeURIComponent(JSON.stringify({ relation: "datablocks" })),
        )
        .query("includeFields=" + encodeURIComponent(JSON.stringify(rFields)))
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array").to.have.lengthOf(2);
          const ds1 = res.body.find((d) => d.pid === datasetPid1);
          const ds2 = res.body.find((d) => d.pid === datasetPid2);
          should.exist(ds1, `Dataset with pid ${datasetPid1} should exist`);
          should.exist(ds2, `Dataset with pid ${datasetPid2} should exist`);

          ds1.should.have
            .property("datablocks")
            .that.is.an("array")
            .with.lengthOf(2);
          ds1.datablocks
            .map((db) => db._id)
            .should.include.members([datablockId1, datablockId2]);
          ds2.should.have
            .property("datablocks")
            .that.is.an("array")
            .with.lengthOf(3);
          ds2.datablocks
            .map((db) => db._id)
            .should.include.members([datablockId3, datablockId4, datablockId5]);
        });
    });

    it("0030: Should return dataset details from V3 endpoint for a specific job and include no further information as a user from ADMIN_GROUP", async () => {
      const dsFields = {
        pid: true,
        sourceFolder: true,
        contactEmail: true,
        owner: true,
        ownerGroup: true,
        classification: true,
        type: true,
        datasetlifecycle: true,
        createdBy: true,
      };
      return request(appUrl)
        .get(`/api/v3/Jobs/datasetDetails`)
        .send({})
        .query("jobId=" + encodedJob)
        .query("datasetFields=" + encodeURIComponent(JSON.stringify(dsFields)))

        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array").to.have.lengthOf(2);
          const ds1 = res.body.find((d) => d.pid === datasetPid1);
          const ds2 = res.body.find((d) => d.pid === datasetPid2);
          should.exist(ds1, `Dataset with pid ${datasetPid1} should exist`);
          should.exist(ds2, `Dataset with pid ${datasetPid2} should exist`);
          ds1.should.include.keys([
            "pid",
            "sourceFolder",
            "contactEmail",
            "owner",
            "ownerGroup",
            "classification",
            "type",
            "datasetlifecycle",
            "createdBy",
          ]);
        });
    });
  });
});
