"use strict";
const assert = require("node:assert");
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  accessTokenUser3 = null,
  accessTokenUser4 = null,

  datasetPid = null,
  datasetPidWrong = null,
  origDatablockMinPid = null,
  origDatablockPid = null;

describe("2800: OrigDatablock v4 endpoint tests", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("OrigDatablock").deleteMany({});

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });

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

    accessTokenUser4 = await utils.getToken(appUrl, {
      username: "user4",
      password: TestData.Accounts["user4"]["password"],
    });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({...TestData.RawCorrectMinV4, ownerGroup: "group1", accessGroups: [ "group3" ]})
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        datasetPid = res.body.pid;
      });

    datasetPidWrong = TestData.PidPrefix + "/" + uuidv4();

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({...TestData.OrigDatablockV4MinCorrect, datasetId: datasetPid, ownerGroup: "group1", accessGroups: [ "group3" ]})
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        origDatablockMinPid = res.body._id;
      });
    
    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({...TestData.OrigDatablockV4Correct, datasetId: datasetPid, ownerGroup: "group1", accessGroups: [ "group3" ]})
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        origDatablockPid = res.body._id;
      });
  });

  async function deleteDataset(item) {
    const response = await request(appUrl)
      .delete(`/api/v4/datasets/${encodeURIComponent(item.pid)}`)
      .auth(accessTokenArchiveManager, { type: "bearer" })
      .expect(TestData.SuccessfulDeleteStatusCode);

    return response;
  }

  async function deleteOrigDatablock(item) {
    const response = await request(appUrl)
      .delete(`/api/v4/origdatablocks/${encodeURIComponent(item._id)}`)
      .auth(accessTokenArchiveManager, { type: "bearer" })
      .expect(TestData.SuccessfulDeleteStatusCode);

    return response;
  }

  async function processDatasetArray(array) {
    for (const item of array) {
      await deleteDataset(item);
    }
  }
  
  async function processOrigDatablockArray(array) {
    for (const item of array) {
      await deleteOrigDatablock(item);
    }
  }

  describe("OrigDatablocks validation tests", () => {
    it("0100: should not be able to validate origdatablock if not logged in", async () => {
      const odb = {
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks/isValid")
        .send(odb)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0101: check if minimal origdatablock is valid", async () => {
      const odb = {
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks/isValid")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("0102: check if average origdatablock is valid", async () => {
      const odb = {
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks/isValid")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("0103: check if origdatablock with wrong field type is valid", async () => {
      const odb = {
        ...TestData.OrigDatablockV4WrongType,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks/isValid")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(false);
        });
    });

    it("0104: check if origdatablock with missing field is valid", async () => {
      const odb = {
        ...TestData.OrigDatablockV4MissingField,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks/isValid")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(false);
        });
    });

    it("0105: check if origdatablock with empty dataFileList is valid", async () => {
      const odb = {
        ...TestData.OrigDatablockV4EmptyDataFiles,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks/isValid")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(false);
        });
    });

    it("0106: check if origdatablock with wrong chkAlg is valid", async () => {
      const odb = {
        ...TestData.OrigDatablockV4EmptyChkAlg,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks/isValid")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(false);
        });
    });

    it("0107: check if origdatablock with wrong pid is valid", async () => {
      const odb = {
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPidWrong,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks/isValid")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.statusCode.should.not.be.equal(200);
        });
    });
  });

  describe("OrigDatablocks creation tests", () => {
    it("0200: should not be able to create origdatablock if not logged in", async () => {
      const odb = {
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0201: adds a new minimal origdatablock", async () => {
      const odb = {
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("ownerGroup").and.be.a("string");
        });
    });

    it("0202: adds a new origdatablock", async () => {
      const odb = {
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("ownerGroup").and.be.a("string");
        });
    });

    it("0203: tries to add an origdatablock with wrong data type", async () => {
      const odb = {
        ...TestData.OrigDatablockV4WrongType,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.statusCode.should.not.be.equal(200);
        });
    });

    it("0204: tries to add an origdatablock with missing field", async () => {
      const odb = {
        ...TestData.OrigDatablockV4MissingField,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.statusCode.should.not.be.equal(200);
        });
    });

    it("0205: tries to add an origdatablock with empty dataFileList", async () => {
      const odb = {
        ...TestData.OrigDatablockV4EmptyDataFiles,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.statusCode.should.not.be.equal(200);
        });
    });

    it("0206: tries to add an origdatablock with wrong chkAlg", async () => {
      const odb = {
        ...TestData.OrigDatablockV4EmptyChkAlg,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.statusCode.should.not.be.equal(200);
        });
    });

    it("0207: tries to add an origdatablock with wrong datasetId", async () => {
      const odb = {
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPidWrong,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.statusCode.should.not.be.equal(200);
        });
    });

    it("0250: should be able to add new origdatablock with access to datasetId", async () => {
      const odb = {
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("ownerGroup").and.be.a("string");
        });
    });
    
    it("0251: should not be able to add new origdatablock with user that is not in create dataset list", async () => {
      const odb = {
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.CreationForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0252: should not be able to add new origdatablock without access to datasetId", async () => {
      const odb = {
        ...TestData.OrigDatablockV4Correct,
        datasetId: datasetPid,
      };
      return request(appUrl)
        .post("/api/v4/origdatablocks")
        .send(odb)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("OrigDatablocks v4 findAll tests", () => {
    it("0300: should not be able to fetch origdatablocks if not logged in", async () => {
      const filter = {
        limits: {
          limit: 2,
          skip: 0,
          sort: {
            _id: "asc",
          },
        },
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0301: should fetch several origdatablocks using limits sort filter", async () => {
      const filter = {
        limits: {
          limit: 2,
          skip: 0,
          sort: {
            _id: "asc",
          },
        },
      };

      await request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(2);
          const [firstOrigDatablock, secondOrigDatablock] = res.body;
          firstOrigDatablock._id.should.satisfy(
            () => firstOrigDatablock._id <= secondOrigDatablock._id,
          );
        });

      filter.limits.sort._id = "desc";

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(2);
          const [firstOrigDatablock, secondOrigDatablock] = res.body;
          firstOrigDatablock._id.should.satisfy(
            () => firstOrigDatablock._id >= secondOrigDatablock._id,
          );
        });
    });

    it("0302: should fetch different origdatablock if skip is used in limits filter", async () => {
      let responseBody;
      const filter = {
        limits: {
          limit: 1,
          skip: 0,
          sort: {
            _id: "asc",
          },
        },
      };

      await request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(1);
          responseBody = res.body;
        });

      filter.limits.skip = 1;

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(1);
          JSON.stringify(responseBody).should.not.be.equal(
            JSON.stringify(res.body),
          );
        });
    });

    it("0303: should fetch specific origdatablock fields only if fields is provided in the filter", async () => {
      const filter = {
        fields: ["_id", "datasetId"],
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.forEach((odb) => {
            odb.should.have.property("_id").and.be.a("string");
            odb.should.have.property("datasetId").and.be.a("string");
            odb.should.not.have.property("size");
            odb.should.not.have.property("chkAlg");
          });
        });
    });

    it("0304: should fetch origdatablock relation fields if provided in the filter", async () => {
      const filter = {
        include: ["dataset"],
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.forEach((odb) => {
            odb.should.have.property("_id").and.be.a("string");
            odb.should.have.property("datasetId").and.be.a("string");
            odb.should.have.property("dataset");
            odb.dataset.should.be.a("array");
            odb.dataset.should.have.length(1);
            const [dataset] = odb.dataset;
            dataset.should.have.property("pid");
          });
        });
    });

    it("0305: should fetch origdatablocks with related items when requested with all relations", async () => {
      const filter = {
        include: ["all"],
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.forEach((odb) => {
            odb.should.have.property("_id").and.be.a("string");
            odb.should.have.property("datasetId").and.be.a("string");
            odb.should.have.property("dataset");
            odb.dataset.should.be.a("array");
            odb.dataset.should.have.length(1);
            const [dataset] = odb.dataset;
            dataset.should.have.property("pid");
          });          
        });
    });

    it("0306: should be able to fetch the origdatablocks providing where filter", async () => {
      const filter = {
        where: {
          datasetId: datasetPid,
        },
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.forEach((odb) => {
            odb.should.have.property("_id").and.be.a("string");
            odb.should.have.property("datasetId").and.be.a("string");
            odb.datasetId.should.be.eq(datasetPid);
          });
        });
    });

    it("0307: should be able to fetch the origdatablocks providing all allowed filters together", async () => {
      const filter = {
        where: {
          datasetId: datasetPid,
        },
        include: ["all"],
        fields: ["_id", "datasetId", "dataset"],
        limits: {
          limit: 2,
          skip: 0,
          sort: {
            _id: "asc",
          },
        },
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(2);
          res.body.forEach((odb) => {
            odb.should.have.property("_id").and.be.a("string");
            odb.should.have.property("datasetId").and.be.a("string");
            odb.datasetId.should.be.eq(datasetPid);
            odb.should.have.property("dataset");
            odb.dataset.should.be.a("array");
            odb.dataset.should.have.length(1);
            const [dataset] = odb.dataset;
            dataset.should.have.property("pid");
            dataset.pid.should.be.eq(datasetPid);
            odb.should.not.have.property("size");
            odb.should.not.have.property("chkAlg");
          });
        });
    });

    it("0308: should not be able to provide filters that are not allowed", async () => {
      const filter = {
        customField: { datasetId: "test" },
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0350: should not be able to fetch origdatablocks without the correct access rights", async () => {
      const filter = {};

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(0);
        });
    });

    it("0351: should fetch origdatablocks and relation fields with correct data included with ownerGroup rights", async () => {
      const filter = {
        include: [
          "dataset",
        ],
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.forEach((odb) => {
            odb.should.have.property("_id").and.be.a("string");
            odb.should.have.property("datasetId").and.be.a("string");
            odb.should.have.property("dataset");
            odb.dataset.should.be.a("array");
            odb.dataset.should.have.length(1);
            const [dataset] = odb.dataset;
            dataset.should.have.property("pid");
          });
        });
    });

    it("0352: should fetch origdatablocks and relation fields with correct data included with accessGroup rights", async () => {
      const filter = {
        include: [
          "dataset",
        ],
      };

      return request(appUrl)
        .get("/api/v4/origdatablocks")
        .query({ filter: JSON.stringify(filter) })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.forEach((odb) => {
            odb.should.have.property("_id").and.be.a("string");
            odb.should.have.property("datasetId").and.be.a("string");
            odb.should.have.property("dataset");
            odb.dataset.should.be.a("array");
            odb.dataset.should.have.length(1);
            const [dataset] = odb.dataset;
            dataset.should.have.property("pid");
            dataset.pid.should.be.eq(datasetPid);
          });
        });
    });
  });

  describe("OrigDatablocks v4 findById tests", () => {
    it("0400: should not be able to fetch origdatablock by id if not logged in", () => {
      return request(appUrl)
        .get(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockMinPid)}`)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0401: should fetch origdatablock by id", () => {
      return request(appUrl)
        .get(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockMinPid)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body._id.should.be.eq(origDatablockMinPid);
        });
    });

    it("0402: should fetch origdatablock relation fields if provided in the filter", () => {
      return request(appUrl)
        .get(
          `/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}?include=dataset`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("datasetId").and.be.a("string");
          res.body.should.have.property("dataset");
          res.body.dataset.should.be.a("array");
          res.body.dataset.should.have.length(1);
          const [dataset] = res.body.dataset;
          dataset.should.have.property("pid");
        });
    });

    it("0403: should fetch all origdatablock relation fields if provided in the filter", () => {
      return request(appUrl)
        .get(
          `/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}?include=all`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("datasetId").and.be.a("string");
          res.body.should.have.property("dataset");
          res.body.dataset.should.be.a("array");
          res.body.dataset.should.have.length(1);
          const [dataset] = res.body.dataset;
          dataset.should.have.property("pid");
        });
    });

    it("0450: should not be able to fetch origdatablock without the correct access rights", () => {
      return request(appUrl)
        .get(
          `/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`,
        )
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0451: should fetch origdatablocks and relation fields with correct data included with ownerGroup rights", () => {
      return request(appUrl)
        .get(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}?include=dataset`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("datasetId").and.be.a("string");
          res.body.should.have.property("dataset");
          res.body.dataset.should.be.a("array");
          res.body.dataset.should.have.length(1);
          const [dataset] = res.body.dataset;
          dataset.should.have.property("pid");
        });
    });

    it("0452: should fetch origdatablocks and relation fields with correct data included with accessGroup rights", () => {
      return request(appUrl)
        .get(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}?include=dataset`)
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("datasetId").and.be.a("string");
          res.body.should.have.property("dataset");
          res.body.dataset.should.be.a("array");
          res.body.dataset.should.have.length(1);
          const [dataset] = res.body.dataset;
          dataset.should.have.property("pid");
        });
    });
  });

  describe("OrigDatablocks v4 update tests", () => {
    it("0500: should not be able to partially update origdatablock if not logged in", () => {
      const updatedOrigDatablock = {
        size: 400,
      };

      return request(appUrl)
        .patch(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`)
        .send(updatedOrigDatablock)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0501: should be able to partially update origdatablock with admin rights", () => {
      const updatedOrigDatablock = {
        size: 400,
      };

      return request(appUrl)
        .patch(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`)
        .send(updatedOrigDatablock)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("datasetId").and.be.a("string");
          res.body.should.have.property("size")
          res.body.size.should.be.eq(updatedOrigDatablock.size);
        });
    });

    it("0502: should be able to partially update origdatablock with ownerGroup rights", () => {
      const updatedOrigDatablock = {
        size: 500,
      };

      return request(appUrl)
        .patch(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`)
        .send(updatedOrigDatablock)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("datasetId").and.be.a("string");
          res.body.should.have.property("size");
          res.body.size.should.be.eq(updatedOrigDatablock.size);
        });
    });

    it("0503: should not be able to partially update origdatablock with accessGroup rights", () => {
      const updatedOrigDatablock = {
        size: 400,
      };

      return request(appUrl)
        .patch(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`)
        .send(updatedOrigDatablock)
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("OrigDatablocks v4 delete tests", () => {
    it("0600: should not be able to delete origdatablock if not logged in", () => {
      return request(appUrl)
        .delete(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0601: should not be able to delete origdatablock as owner", () => {
      return request(appUrl)
        .delete(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0602: should not be able to delete origdatablock as adminIngestor", () => {
      return request(appUrl)
        .delete(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0603: should be able to delete origdatablock as archivemanager", () => {
      return request(appUrl)
        .delete(`/api/v4/origdatablocks/${encodeURIComponent(origDatablockPid)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("_id").and.be.a("string");
          res.body.should.have.property("datasetId").and.be.a("string");
        });
    });
  });

  describe("Cleanup after the tests", () => {
    it("0700: delete all origdatablocks as archivemanager", async () => {
      return await request(appUrl)
        .get("/api/v4/origdatablocks")
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          return processOrigDatablockArray(res.body);
        });
    });

    it("0701: delete all datasets as archivemanager", async () => {
      return await request(appUrl)
        .get("/api/v4/datasets")
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          return processDatasetArray(res.body);
        });
    });
  });

  describe("OrigDatablocks v4 optimistic concurrency control tests", () => {
    it("0800: should fail one request with HTTP 412 when two requests try to update the same origdatablock", async () => {
      const res = await request(appUrl)
        .post("/api/v4/origdatablocks")
        .send({
          ...TestData.OrigDatablockV4MinCorrect,
          datasetId: datasetPid,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      const id = encodeURIComponent(res.body._id);

      const [res1, res2] = await Promise.all([
        request(appUrl)
          .patch(`/api/v4/origdatablocks/${id}`)
          .send({ size: 400 })
          .set("if-unmodified-since", res.body.updatedAt)
          .auth(accessTokenAdminIngestor, { type: "bearer" }),
        request(appUrl)
          .patch(`/api/v4/origdatablocks/${id}`)
          .send({ size: 500 })
          .set("if-unmodified-since", res.body.updatedAt)
          .auth(accessTokenAdminIngestor, { type: "bearer" }),
      ]);
      assert(
        [res1.statusCode, res2.statusCode].includes(
          TestData.SuccessfulPatchStatusCode,
        ),
        "Neither PATCH request succeeded",
      );
      if (res1.status === TestData.SuccessfulPatchStatusCode) {
        assert(res2.statusCode == TestData.PreconditionFailedStatusCode);
      } else {
        assert(res1.statusCode == TestData.PreconditionFailedStatusCode);
      }
    });
  });
});
