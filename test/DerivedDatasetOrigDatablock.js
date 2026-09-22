"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null,
  datasetPid = null,
  origDatablockId1 = null,
  origDatablockId2 = null;

describe("0800: DerivedDatasetOrigDatablock: Test OrigDatablocks and their relation to derived Datasets", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("OrigDatablock").deleteMany({});

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

  it("0010: adds a new derived dataset", async () => {
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

  it("0020: validate correct origDatablock data used later", async () => {
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/origdatablocks/isValid`)
      .send(TestData.OrigDataBlockCorrect1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(true);
        res.body.should.have
          .property("errors")
          .and.be.instanceof(Array)
          .and.to.have.lengthOf(0);
      });
  });

  it("0030: validate wrong origDatablock and expect false", async () => {
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/origdatablocks/isValid`)
      .send(TestData.OrigDataBlockWrong)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(false);
        res.body.should.have
          .property("errors")
          .and.be.instanceof(Array)
          .and.to.have.lengthOf.above(0);
      });
  });

  it("0040: adds a new origDatablock with wrong account which should fail", async () => {
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/OrigDatablocks`)
      .send(TestData.OrigDataBlockCorrect1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0050: adds a new origDatablock with correct account", async () => {
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/OrigDatablocks`)
      .send(TestData.OrigDataBlockCorrect1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(TestData.OrigDataBlockCorrect1.size);
        res.body.should.have.property("id").and.be.string;
        origDatablockId1 = res.body["id"];
      });
  });

  it("0055: The new dataset should have the size of the first origDatablock", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(TestData.OrigDataBlockCorrect1.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(TestData.OrigDataBlockCorrect1.dataFileList.length);
      });
  });

  it("0060: adds a second origDatablock", async () => {
    return request(appUrl)
      .post(`/api/v3/datasets/${datasetPid}/OrigDatablocks`)
      .send(TestData.OrigDataBlockCorrect2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(TestData.OrigDataBlockCorrect2.size);
        res.body.should.have.property("id").and.be.string;
        origDatablockId2 = res.body["id"];
      });
  });

  it("0070: Should fetch all origdatablocks belonging to the new dataset", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}/OrigDatablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(2);
        res.body[0]["id"].should.be.oneOf([origDatablockId1, origDatablockId2]);
        res.body[1]["id"].should.be.oneOf([origDatablockId1, origDatablockId2]);
      });
  });

  it("0075: Should count all origdatablocks belonging to the new dataset", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}/OrigDatablocks/count`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => res.body.count.should.be.equal(2));
  });

  it("0080: The new dataset should be the sum of the size of the origDatablocks", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(
            TestData.OrigDataBlockCorrect1.size +
              TestData.OrigDataBlockCorrect2.size,
          );
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(
            TestData.OrigDataBlockCorrect1.dataFileList.length +
              TestData.OrigDataBlockCorrect2.dataFileList.length,
          );
      });
  });

  it("0090: should fetch one dataset including related data", async () => {
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
          relation: "origdatablocks",
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
        res.body.origdatablocks.should.be
          .instanceof(Array)
          .and.to.have.length(2);
        res.body.origdatablocks[0].should.have
          .property("dataFileList")
          .and.be.instanceof(Array)
          .and.to.have.length(
            TestData.OrigDataBlockCorrect1.dataFileList.length,
          );
      });
  });

  it("0095: should fetch one dataset origdatablocks with pid", async () => {
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
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetPid2,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);

    const filter = {
      where: {
        pid: decodeURIComponent(datasetPid),
      },
      include: [
        {
          relation: "origdatablocks",
        },
      ],
    };

    return request(appUrl)
      .get(
        "/api/v3/Datasets/findOne?filter=" +
          encodeURIComponent(JSON.stringify(filter)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.origdatablocks.should.be
          .instanceof(Array)
          .and.to.have.length(2);
      });
  });

  it("0100: Should fetch some origDatablock by the full filename and dataset pid", async () => {
    const fields = {
      datasetId: decodeURIComponent(datasetPid),
      "dataFileList.path": "N1039-B410377.tif",
    };
    const limits = {
      skip: 0,
      limit: 20,
    };
    return request(appUrl)
      .get(
        "/api/v3/OrigDatablocks/fullQuery?fields=" +
          encodeURIComponent(JSON.stringify(fields)) +
          "&limits=" +
          encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(2);
      });
  });

  it("0110: Should fetch some origDatablock by the partial filename and dataset pid", async () => {
    const fields = {
      datasetId: decodeURIComponent(datasetPid),
      "dataFileList.path": { $regex: "B410" },
    };
    const limits = {
      skip: 0,
      limit: 20,
    };
    return request(appUrl)
      .get(
        "/api/v3/OrigDatablocks/fullQuery?fields=" +
          encodeURIComponent(JSON.stringify(fields)) +
          "&limits=" +
          encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(2);
      });
  });

  it("0120: Should fetch no origDatablock using a non existing filename", async () => {
    const fields = {
      datasetId: decodeURIComponent(datasetPid),
      "dataFileList.path": "this_file_does_not_exists.txt",
    };
    const limits = {
      skip: 0,
      limit: 20,
    };
    return request(appUrl)
      .get(
        "/api/v3/OrigDatablocks/fullQuery?fields=" +
          encodeURIComponent(JSON.stringify(fields)) +
          "&limits=" +
          encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(0);
      });
  });

  it("0130: Should fetch one origDatablock using a specific filename and dataset id", async () => {
    const fields = {
      datasetId: decodeURIComponent(datasetPid),
      "dataFileList.path": "this_unique_file.txt",
    };
    const limits = {
      skip: 0,
      limit: 20,
    };
    return request(appUrl)
      .get(
        "/api/v3/OrigDatablocks/fullQuery?fields=" +
          encodeURIComponent(JSON.stringify(fields)) +
          "&limits=" +
          encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(1);
      });
  });

  it("0140: Fetch origDatablock datafiles should include datasetExist field", async () => {
    const fields = {};
    const limits = {
      skip: 0,
      limit: 20,
    };
    return request(appUrl)
      .get(
        "/api/v3/OrigDatablocks/fullQuery/files?fields=" +
          encodeURIComponent(JSON.stringify(fields)) +
          "&limits=" +
          encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.forEach((origdatablock) =>
          origdatablock.should.have.property("datasetExist"),
        );
      });
  });

  it("150: Should patch second origdatablock", async () => {
    await request(appUrl)
      .patch(
        `/api/v3/Datasets/${datasetPid}/origdatablocks/${origDatablockId2}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .send({
        size: 123,
        dataFileList: [TestData.OrigDataBlockCorrect2.dataFileList[0]],
      })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => res.body.should.have.property("size").and.equal(123));
    return request(appUrl)
      .get("/api/v3/Datasets/" + datasetPid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(TestData.OrigDataBlockCorrect1.size + 123);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(TestData.OrigDataBlockCorrect1.dataFileList.length + 1);
      });
  });

  it("0160: should delete second OrigDatablock", async () => {
    await request(appUrl)
      .delete(
        `/api/v3/datasets/${datasetPid}/OrigDatablocks/${origDatablockId2}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);

    return request(appUrl)
      .get("/api/v3/Datasets/" + datasetPid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(TestData.OrigDataBlockCorrect1.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(TestData.OrigDataBlockCorrect1.dataFileList.length);
      });
  });

  it("0170: should delete first OrigDatablock", async () => {
    return request(appUrl)
      .delete(
        `/api/v3/datasets/${datasetPid}/OrigDatablocks/${origDatablockId1}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0180: Should fetch no origdatablocks belonging to the new dataset", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid}/OrigDatablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(0);
      });
  });

  it("0183: should delete all origdatablocks without auth", async () => {
    return request(appUrl)
      .delete(`/api/v3/datasets/${datasetPid}/origdatablocks`)
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0186: should delete all origdatablocks with wrong auth", async () => {
    return request(appUrl)
      .delete(`/api/v3/datasets/${datasetPid}/origdatablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0189: should delete all origdatablocks attached to dataset", async () => {
    const dataset2 = await request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.DerivedCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);
    const datasetPid2 = encodeURIComponent(dataset2.body["pid"]);

    await request(appUrl)
      .post(`/api/v3/datasets/${datasetPid2}/origdatablocks`)
      .send({ ...TestData.OrigDataBlockCorrect1 })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);

    await request(appUrl)
      .post(`/api/v3/datasets/${datasetPid2}/origdatablocks`)
      .send({ ...TestData.OrigDataBlockCorrect1 })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);

    await request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.be.greaterThan(0);
        res.body.should.have.property("numberOfFiles").and.be.greaterThan(0);
      });

    await request(appUrl)
      .delete(`/api/v3/datasets/${datasetPid2}/origdatablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => res.body.should.have.property("count").and.equal(2));

    await request(appUrl)
      .get(`/api/v3/Datasets/${datasetPid2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.equal(0);
        res.body.should.have.property("numberOfFiles").and.equal(0);
      });

    await request(appUrl)
      .delete(`/api/v3/Datasets/${datasetPid2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0190: The size and numFiles fields in the dataset should be zero", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + datasetPid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.equal(0);
        res.body.should.have.property("numberOfFiles").and.equal(0);
      });
  });

  it("0200: add a new origDatablock to the non-existent dataset should fail", async () => {
    return request(appUrl)
      .post(`/api/v3/origdatablocks`)
      .send({ ...TestData.OrigDataBlockCorrect1, datasetId: "wrong" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("error");
      });
  });

  it("0210: add a new origDatablock to the existent dataset should success", async () => {
    return request(appUrl)
      .post(`/api/v3/origdatablocks`)
      .send({
        ...TestData.OrigDataBlockCorrect1,
        datasetId: decodeURIComponent(datasetPid),
        ownerGroup: "string",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id").and.be.string;
      });
  });

  it("0220: should delete the newly created dataset", async () => {
    return request(appUrl)
      .delete(`/api/v3/Datasets/${datasetPid}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });
});
