"use strict"
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdmin = null,
  datasetPid1 = null,
  datasetPid2 = null,
  datasetPid3 = null,
  jobId1 = null,
  jobId2 = null,
  jobId3 = null,
  origDatablock1 = null,
  origDatablock2 = null,
  origDatablock3 = null;

describe("1175: Jobs retrieving with sorting", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("OrigDatablock").deleteMany({});
    db.collection("Job").deleteMany({});

    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "admin",
      password: TestData.Accounts["admin"]["password"],
    });

    const dataset1 = {
      ...TestData.RawCorrectV4,
      isPublished: true,
      ownerGroup: "group1",
      accessGroups: ["group5"],
      datasetlifecycle: {
        archivable: true,
        retrievable: false,
      },
    };

    const dataset2 = {
      ...TestData.RawCorrectV4,
      isPublished: false,
      ownerGroup: "group3",
      accessGroups: [],
      datasetlifecycle: {
        archivable: true,
        retrievable: true,
      },
    };

    const dataset3 = {
      ...TestData.RawCorrectV4,
      isPublished: false,
      ownerGroup: "group5",
      accessGroups: ["group1"],
      datasetlifecycle: {
        archivable: true,
        retrievable: true,
      },
    };

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...dataset1,
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPid1 = res.body["pid"];
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...dataset2,
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPid2 = res.body["pid"];
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...dataset3,
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPid3 = res.body["pid"];
      });

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid1,
        ownerGroup: "group1",
        accessGroups: ["group5"],
      })
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        origDatablock1 = res.body._id;
      });

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid2,
        ownerGroup: "group3",
      })
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        origDatablock2 = res.body._id;
      });

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid3,
        ownerGroup: "group5",
        accessGroups: ["group1"],
      })
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        origDatablock3 = res.body._id;
      });

    await request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "admin",
        ownerGroup: "admin",
        jobParams: {
          datasetList: [{ pid: datasetPid1, files: [] }],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        jobId1 = res.body["id"];
      });

    await request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "dataset_access",
        ownerUser: "user1",
        ownerGroup: "group1",
        jobParams: {
          datasetList: [
            { pid: datasetPid1, files: [] },
            { pid: datasetPid2, files: [] },
            { pid: datasetPid3, files: [] },
          ],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        jobId2 = res.body["id"];
      });

    await request(appUrl)
      .patch("/api/v4/Jobs/" + jobId2)
      .send({
        statusCode: "inProgress",
        statusMessage: "Job started",
        jobResultObject: {},
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);

    await request(appUrl)
      .post("/api/v4/Jobs")
      .send({
        type: "owner_access",
        ownerUser: "user5.1",
        ownerGroup: "group5",
        jobParams: {
          datasetList: [
            { pid: datasetPid1, files: [] },
            { pid: datasetPid2, files: [] },
            { pid: datasetPid3, files: [] },
          ],
        },
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        jobId3 = res.body["id"];
      });

    await request(appUrl)
      .patch("/api/v4/Jobs/" + jobId3)
      .send({
        statusCode: "finishedSuccessful",
        statusMessage: "Job completed successfully",
        jobResultObject: {},
      })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  after(() => {
    db.collection("Dataset").deleteMany({});
    db.collection("OrigDatablock").deleteMany({});
    db.collection("Job").deleteMany({});
  });

  it("0010: should sort jobs by type ascending", async () => {
    const filter = {
      limits: {
        sort: {
          type: "asc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => j.type);
        const sorted = [...values].sort();

        values.should.deep.equal(sorted);
      });
  });

  it("0020: should sort jobs by type descending", async () => {
    const filter = {
      limits: {
        sort: {
          type: "desc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => j.type);
        const sorted = [...values].sort().reverse();

        values.should.deep.equal(sorted);
      });
  });

  it("0030: should sort jobs by ownerUser ascending", async () => {
    const filter = {
      limits: {
        sort: {
          ownerUser: "asc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => j.ownerUser);
        const sorted = [...values].sort();

        values.should.deep.equal(sorted);
      });
  });

  it("0040: should sort jobs by ownerUser descending", async () => {
    const filter = {
      limits: {
        sort: {
          ownerUser: "desc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => j.ownerUser);
        const sorted = [...values].sort().reverse();

        values.should.deep.equal(sorted);
      });
  });

  it("0050: should sort jobs by statusCode ascending", async () => {
    const filter = {
      limits: {
        sort: {
          statusCode: "asc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => j.statusCode);
        const sorted = [...values].sort();

        values.should.deep.equal(sorted);
      });
  });

  it("0060: should sort jobs by statusCode descending", async () => {
    const filter = {
      limits: {
        sort: {
          statusCode: "desc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => j.statusCode);
        const sorted = [...values].sort().reverse();

        values.should.deep.equal(sorted);
      });
  });

  it("0070: should sort jobs by createdAt ascending", async () => {
    const filter = {
      limits: {
        sort: {
          createdAt: "asc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => new Date(j.createdAt).getTime());
        const sorted = [...values].sort((a, b) => a - b);

        values.should.deep.equal(sorted);
      });
  });

  it("0080: should sort jobs by createdAt descending", async () => {
    const filter = {
      limits: {
        sort: {
          createdAt: "desc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => new Date(j.createdAt).getTime());
        const sorted = [...values].sort((a, b) => b - a);

        values.should.deep.equal(sorted);
      });
  });

  it("0090: should apply sorting together with limit", async () => {
    const filter = {
      limits: {
        limit: 5,
        sort: {
          type: "asc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => j.type);
        values.should.have.lengthOf.at.most(5);
        const sorted = [...values].sort();

        values.should.deep.equal(sorted);
      });
  });

  it("0100: should apply sorting together with where filter", async () => {
    const filter = {
      where: {
        type: "data_access",
      },
      limits: {
        sort: {
          ownerGroup: "asc",
        },
      },
    };

    return request(appUrl)
      .get("/api/v4/Jobs")
      .query({ filter: JSON.stringify(filter) })
      .set("Accept", "application/json")
      .auth(accessTokenAdmin, { type: "bearer" })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        const values = res.body.map((j) => j.ownerGroup);
        values.forEach((j) => {
          expect(j.type).to.equal("archive");
        });
        const sorted = [...values].sort();

        values.should.deep.equal(sorted);
      });
  });
});
