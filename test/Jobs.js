"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser51 = null,
  accessTokenAdmin = null,
  datasetPid1 = null,
  datasetPid2 = null,
  datasetPid3 = null,
  jobIdValidate1 = null,
  encodedJobIdValidate1 = null;

const dataset1 = {
  ...TestData.RawCorrect,
  isPublished: true,
  ownerGroup: "group1",
  accessGroups: ["group5"],
  datasetlifecycle: {
    archivable: true,
    retrievable: false,
  },
};

const dataset2 = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "group3",
  accessGroups: [],
  datasetlifecycle: {
    archivable: true,
    retrievable: true,
  },
};

const dataset3 = {
  ...TestData.RawCorrect,
  isPublished: false,
  ownerGroup: "group5",
  accessGroups: ["group1"],
  datasetlifecycle: {
    archivable: true,
    retrievable: true,
  },
};

const archiveJob = {
  type: "archive",
};
const retrieveJob = {
  type: "retrieve",
};
const publicJob = {
  type: "public",
};
const jobValidate = {
  type: "validate",
};

describe("1110: Jobs: Test New Job Model: possible real configurations", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("Job").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
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

  after(() => {
    db.collection("Dataset").deleteMany({});
    db.collection("OrigDatablock").deleteMany({});
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

  it("0040: Add a new public job as a normal user himself/herself with a published dataset", async () => {
    const newJob = {
      ...publicJob,
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
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.equal("group5");
        res.body.should.have.property("ownerUser").and.be.equal("user5.1");
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0050: Add a new public job as a normal user himself/herself with unpublished datasets, which should fail", async () => {
    const newJob = {
      ...publicJob,
      ownerUser: "user5.1",
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
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("Invalid request. Invalid value for 'isPublished'");
      });
  });

  it("0060: Add a new archive job as a normal user himself/herself with an archivable dataset", async () => {
    const newJob = {
      ...archiveJob,
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
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0070: Add a new retrieve job as a normal user himself/herself with a non retrievable dataset, which should fail", async () => {
    const newJob = {
      ...retrieveJob,
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
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal(
            "Invalid request. Invalid value for 'datasetlifecycle.retrievable'",
          );
      });
  });

  it("0080: Add a new public job as a normal user himself/herself with unknown files, which should fail", async () => {
    const newJob = {
      ...publicJob,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [{ pid: datasetPid1, files: ["fakeID"] }],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("At least one requested file could not be found.");
      });
  });

  it("0090: Add a new public job as a normal user himself/herself choosing only specific files", async () => {
    const newJob = {
      ...publicJob,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [
          {
            pid: datasetPid1,
            files: [
              TestData.OrigDatablockV4Correct.dataFileList[0].path,
              TestData.OrigDatablockV4Correct.dataFileList[1].path,
            ],
          },
        ],
      },
    };

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPid1,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("type").and.be.string;
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0091: Add a second origdatablock to dataset 1, with one new file and one file already in the first origdatablock", async () => {
    return request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPid1,
        dataFileList: [
          TestData.OrigDatablockV4Correct.dataFileList[0],
          {
            ...TestData.OrigDatablockV4Correct.dataFileList[0],
            path: "second-origdatablock-file.tif",
          },
        ],
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);
  });

  it("0092: Add a new public job as a normal user himself/herself choosing files spread across origdatablocks and present in more than one origdatablock", async () => {
    const newJob = {
      ...publicJob,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [
          {
            pid: datasetPid1,
            files: [
              // in both origdatablocks
              TestData.OrigDatablockV4Correct.dataFileList[0].path,
              // only in the first origdatablock
              TestData.OrigDatablockV4Correct.dataFileList[1].path,
              // only in the second origdatablock
              "second-origdatablock-file.tif",
            ],
          },
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
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0093: Add a new public job as a normal user himself/herself with duplicated files and datasets in the request", async () => {
    const file1 = TestData.OrigDatablockV4Correct.dataFileList[0].path;
    const file2 = TestData.OrigDatablockV4Correct.dataFileList[1].path;
    const newJob = {
      ...publicJob,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [file1, file1] },
          { pid: datasetPid1, files: [file1, file2] },
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
        res.body.should.have.property("statusCode").to.be.equal("jobSubmitted");
      });
  });

  it("0094: Add a new public job as a normal user himself/herself with some existing and some unknown files, which should fail", async () => {
    const newJob = {
      ...publicJob,
      ownerUser: "user5.1",
      ownerGroup: "group5",
      jobParams: {
        datasetList: [
          {
            pid: datasetPid1,
            files: [
              TestData.OrigDatablockV4Correct.dataFileList[0].path,
              "unknown-file-1.tif",
              "unknown-file-2.tif",
            ],
          },
        ],
      },
    };

    return request(appUrl)
      .post("/api/v4/Jobs")
      .send(newJob)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser51}` })
      .expect(TestData.UnprocessableEntityStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.not.have.property("id");
        res.body.should.have
          .property("message")
          .and.be.equal("At least one requested file could not be found.");
        res.body.should.have
          .property("error")
          .and.be.equal("2 of 3 requested files do not exist.");
      });
  });

  it("0095: Add a new public job as a user from ADMIN_GROUPS with one existing and one unknown dataset, which should fail", async () => {
    const newJob = {
      ...publicJob,
      ownerUser: "admin",
      ownerGroup: "admin",
      jobParams: {
        datasetList: [
          { pid: datasetPid1, files: [] },
          { pid: "unknown-pid", files: [] },
        ],
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
          .and.be.equal("Datasets with pid unknown-pid do not exist.");
      });
  });

  describe("1115: Validate Job Action", () => {
    it("0010: create validate job fails without required parameters", async () => {
      const newJob = {
        ...jobValidate,
        contactEmail: "test@email.scicat",
        jobParams: {
          optionalParam: false,
          datasetList: [
            {
              pid: datasetPid1,
              files: [],
            },
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
          res.body.should.not.have.property("type");
          res.body.should.have
            .property("message")
            .and.be.equal(
              "Invalid request. Requires 'jobParams.requiredParam'",
            );
        });
    });

    it("0020: create validate job fails with the wrong types", async () => {
      const newJob = {
        type: "validate",
        contactEmail: "test@email.scicat",
        jobParams: {
          requiredParam: 123,
          arrayOfStrings: ["ok"],
          datasetList: [
            {
              pid: datasetPid1,
              files: [],
            },
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
          res.body.should.not.have.property("type");
          res.body.should.have
            .property("message")
            .and.be.equal(
              "Invalid request. Invalid value for 'jobParams.requiredParam'",
            );
        });
    });
    it("0030: create validate job fails with the wrong types", async () => {
      const newJob = {
        type: "validate",
        contactEmail: "test@email.scicat",
        jobParams: {
          requiredParam: "ok",
          arrayOfStrings: "bad",
          datasetList: [
            {
              pid: datasetPid1,
              files: [],
            },
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
          res.body.should.not.have.property("type");
          res.body.should.have
            .property("message")
            .and.be.equal(
              "Invalid request. Invalid value for 'jobParams.arrayOfStrings'",
            );
        });
    });
    it("0040: create validate job fails with the wrong types", async () => {
      const newJob = {
        type: "validate",
        contactEmail: "test@email.scicat",
        jobParams: {
          requiredParam: "ok",
          arrayOfStrings: [123],
          datasetList: [
            {
              pid: datasetPid1,
              files: [],
            },
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
          res.body.should.not.have.property("type");
          res.body.should.have
            .property("message")
            .and.be.equal(
              "Invalid request. Invalid value for 'jobParams.arrayOfStrings'",
            );
        });
    });

    it("0050: create validate fails without datasetList", async () => {
      const newDataset = {
        type: "validate",
        contactEmail: "test@email.scicat",
        jobParams: {
          requiredParam: "ok",
          arrayOfStrings: ["ok"],
        },
      };

      return request(appUrl)
        .post("/api/v4/Jobs")
        .send(newDataset)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.not.have.property("type");
          res.body.should.have
            .property("message")
            .and.be.equal("'jobParams.datasetList' is required.");
        });
    });

    it("0060: create validate succeeds with the right types", async () => {
      const newJob = {
        type: "validate",
        contactEmail: "test@email.scicat",
        jobParams: {
          requiredParam: "ok",
          arrayOfStrings: ["ok"],
          datasetList: [
            {
              pid: datasetPid1,
              files: [],
            },
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
          res.body.should.have.property("type").and.equal("validate");
          res.body.should.have.property("createdBy").and.equal("admin");
          res.body.should.have
            .property("jobParams")
            .that.deep.equals(newJob.jobParams);

          jobIdValidate1 = res.body["id"];
          encodedJobIdValidate1 = encodeURIComponent(jobIdValidate1);
        });
    });

    it("0070: update validate fails without the required parameters", async () => {
      const update = {
        statusCode: "finished",
        statusMessage: "done",
        jobResultObject: {
          requiredParam: "ok",
          arrayOfStringsMissing: ["fail"],
        },
      };

      return request(appUrl)
        .patch(`/api/v4/Jobs/${encodedJobIdValidate1}`)
        .send(update)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.not.have.property("type");
          res.body.should.have
            .property("message")
            .and.be.equal("Invalid request. Invalid value for '$'");
        });
    });

    it("0080: update validate fails with incorrect types", async () => {
      const update = {
        statusCode: "finished",
        statusMessage: "done",
        jobResultObject: {
          requiredParam: "ok",
          arrayOfStringsMissing: [123],
        },
      };

      return request(appUrl)
        .patch(`/api/v4/Jobs/${encodedJobIdValidate1}`)
        .send(update)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.not.have.property("type");
          res.body.should.have
            .property("message")
            .and.be.equal("Invalid request. Invalid value for '$'");
        });
    });

    it("0090: updating validate succeeds with the required parameters", async () => {
      const update = {
        statusCode: "finished",
        statusMessage: "done",
        jobResultObject: {
          requiredParam: "ok",
          arrayOfStrings: ["ok"],
        },
      };

      return request(appUrl)
        .patch(`/api/v4/Jobs/${encodedJobIdValidate1}`)
        .send(update)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdmin}` })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("type").and.equal("validate");
          res.body.should.have.property("createdBy").and.equal("admin");
          res.body.should.have.property("jobParams").that.deep.equals({
            requiredParam: "ok",
            arrayOfStrings: ["ok"],
            datasetList: [
              {
                pid: datasetPid1,
                files: [],
              },
            ],
          });
          res.body.should.have
            .property("jobResultObject")
            .that.deep.equals(update.jobResultObject);
        });
    });
  });
});
