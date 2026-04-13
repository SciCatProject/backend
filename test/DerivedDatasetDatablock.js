"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null,

  datasetPid = null,
  datablockId1 = null,
  datablockId2 = null;

describe("0750: DerivedDatasetDatablock: Test Datablocks and their relation to derived Datasets", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("Datablock").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
  });

  after(() => {
    db.collection("Datablock").deleteMany({});
  });

  it("0100:adds a new derived dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.DerivedCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("type").and.equal("derived");
        res.body.should.have.property("pid").and.be.string;
        // store link to this dataset in datablocks
        datasetPid = encodeURIComponent(res.body["pid"]);
      });
  });

  it("0110: adds a new datablock with wrong account which should fail", async () => {
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/datablocks`)
      .send(TestData.DataBlockCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0120: adds a new datablock with correct account", async () => {
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/datablocks`)
      .send(TestData.DataBlockCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("packedSize")
          .and.equal(TestData.DataBlockCorrect.packedSize);
        res.body.should.have.property("id").and.be.string;
        datablockId1 = res.body["id"];
      });
  });

  it("0130: adds the same datablock again which should fail because it is already stored", async () => {
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/Datablocks`)
      .send(TestData.DataBlockCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.ApplicationErrorStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.should.have.property("error");
      });
  });

  it("0140: adds a second datablock", async () => {
    let testdata = { ...TestData.DataBlockCorrect };
    testdata.archiveId = "some-other-id-that-is-different";
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/datablocks`)
      .send(testdata)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.equal(testdata.size);
        res.body.should.have.property("id").and.be.string;
        datablockId2 = res.body["id"];
      });
  });

  it("0150: Should fetch all datablocks belonging to the new dataset", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}/datablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(2);
        res.body[0]["id"].should.be.oneOf([datablockId1, datablockId2]);
        res.body[1]["id"].should.be.oneOf([datablockId1, datablockId2]);
      });
  });

  it("0155: Should count all datablocks belonging to the new dataset", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}/datablocks/count`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) =>
        res.body.count.should.be.equal(2)
      );
  });

  it("0160: The new dataset should be the sum of the size of the datablocks", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["packedSize"].should.be.equal(TestData.DataBlockCorrect.packedSize * 2);
      });
  });

  it("0170: should fetch one dataset including related data", async () => {
    const limits = {
      skip: 0,
      limit: 10,
    };
    const filter = {
      where: {
        pid: decodeURIComponent(datasetPid),
      },
      include: [
        {
          relation: "datablocks",
        },
      ],
    };

    return request(appUrl)
      .get(
        "/api/v3/Datasets/findOne?filter=" +
        encodeURIComponent(JSON.stringify(filter)) +
        "&limits=" +
        encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.equal(decodeURIComponent(datasetPid));
        res.body.datablocks.should.be.instanceof(Array).and.to.have.length(2);
        res.body.datablocks[0].should.have
          .property("dataFileList")
          .and.be.instanceof(Array)
          .and.to.have.length(TestData.DataBlockCorrect.dataFileList.length);
      });
  });

  it("00175: should fetch one dataset datablocks with pid", async () => {
    let datasetPid2 = null;

    await request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.DerivedCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        datasetPid2 = res.body["pid"];
      });

    await request(appUrl)
      .post("/api/v3/datablocks")
      .send({
        ...TestData.DataBlockCorrect,
        datasetId: datasetPid2,
        archiveId: "dataset2-archive1",
        ownerGroup: TestData.Accounts.user1.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)

    const filter = {
      where: {
        pid: decodeURIComponent(datasetPid),
      },
      include: [
        {
          relation: "datablocks",
        },
      ],
    };

    return request(appUrl)
      .get(
        "/api/v3/Datasets/findOne?filter=" +
        encodeURIComponent(JSON.stringify(filter))
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.datablocks.should.be
          .instanceof(Array)
          .and.to.have.length(2);
      });
  });

  it("0180: The size and numFiles fields in the dataset should be correctly updated", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + datasetPid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("packedSize")
          .and.equal(TestData.DataBlockCorrect.packedSize * 2);
        res.body.should.have
          .property("numberOfFilesArchived")
          .and.equal(TestData.DataBlockCorrect.dataFileList.length * 2);
      });
  });

  it("0181: should delete all datablocks without auth", async () => {
    return request(appUrl)
      .delete(`/api/v3/datasets/${datasetPid}/Datablocks`)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0182: should delete all datablocks with wrong auth", async () => {
    return request(appUrl)
      .delete(`/api/v3/datasets/${datasetPid}/Datablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0183: should delete all datablocks with non-existing pid", async () => {
    return request(appUrl)
      .delete(`/api/v3/datasets/123/Datablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/);
  });

  [null, undefined, "", 0, false].forEach((pid, i) => {
    it(`018${4 + i}: should delete all datablocks with ${pid} pid`, async () => {
      return request(appUrl)
        .delete(`/api/v3/datasets/${pid}/Datablocks`)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
        .expect(TestData.NotFoundStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  it("0189: should delete all datablocks attached to dataset", async () => {
    const dataset2 = await request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.DerivedCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
    const datasetPid2 = encodeURIComponent(dataset2.body["pid"]);

    await request(appUrl)
      .post(`/api/v3/datasets/${datasetPid2}/Datablocks`)
      .send({ ...TestData.DataBlockCorrect, archiveId: "delete-all-archive1" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)

    await request(appUrl)
      .post(`/api/v3/datasets/${datasetPid2}/Datablocks`)
      .send({ ...TestData.DataBlockCorrect, archiveId: "delete-all-archive2" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)

    await request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("packedSize").and.be.greaterThan(0);
        res.body.should.have.property("numberOfFilesArchived").and.be.greaterThan(0);
      });

    await request(appUrl)
      .delete(`/api/v3/datasets/${datasetPid2}/Datablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((res) =>
        res.body.should.have.property("count").and.equal(2)
      );

    await request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("packedSize").and.equal(0);
        res.body.should.have.property("numberOfFilesArchived").and.equal(0);
      });

    await request(appUrl)
      .delete(`/api/v3/Datasets/${datasetPid2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("190: Should patch second datablock", async () => {
    await request(appUrl)
      .patch(`/api/v3/Datasets/${datasetPid}/datablocks/${datablockId2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .send({ packedSize: 123, dataFileList: [TestData.DataBlockCorrect.dataFileList[0]] })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) =>
        res.body.should.have
          .property("packedSize")
          .and.equal(123)
      );
    return request(appUrl)
      .get("/api/v3/Datasets/" + datasetPid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("packedSize")
          .and.equal(TestData.DataBlockCorrect.packedSize + 123);
        res.body.should.have
          .property("numberOfFilesArchived")
          .and.equal(TestData.DataBlockCorrect.dataFileList.length + 1);
      });
  });

  it("195: Should delete second datablock", async () => {
    await request(appUrl)
      .delete(`/api/v3/Datasets/${datasetPid}/datablocks/${datablockId2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulGetStatusCode)

    return request(appUrl)
      .get("/api/v3/Datasets/" + datasetPid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("packedSize")
          .and.equal(TestData.DataBlockCorrect.packedSize);
        res.body.should.have
          .property("numberOfFilesArchived")
          .and.equal(TestData.DataBlockCorrect.dataFileList.length);
      });
  });

  it("0200: should delete first datablock", async () => {
    return request(appUrl)
      .delete(`/api/v3/datasets/${datasetPid}/datablocks/${datablockId1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0210: Should fetch no datablocks belonging to the new dataset", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}/datablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(0);
      });
  });

  it("0220: The size and numFiles fields in the dataset should be zero", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + datasetPid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("packedSize").and.equal(0);
        res.body.should.have.property("numberOfFilesArchived").and.equal(0);
      });
  });

  it("0230: should delete the newly created dataset", async () => {
    return request(appUrl)
      .delete(`/api/v3/Datasets/${datasetPid}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });
});
