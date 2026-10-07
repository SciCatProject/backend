"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  datasetPid1 = null,
  encodedDatasetPid1 = null,
  datasetPid2 = null,
  encodedDatasetPid2 = null,
  origDatablockId1 = null,
  origDatablockId2 = null,
  origDatablockId3 = null,
  origDatablockData1 = null,
  origDatablockData1Modified = null,
  origDatablockData2 = null,
  origDatablockData3 = null,
  origDatablockWithEmptyChkAlg = null,
  origDatablockWithValidChkAlg = null;

describe("1200: OrigDatablockForRawDataset: Test OrigDatablocks and their relation to raw Datasets using origdatablocks endpoint", () => {
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
  });

  beforeEach(async () => {
    origDatablockData1 = {
      ...TestData.OrigDataBlockCorrect1,
      datasetId: null,
    };
    const dataFileList = TestData.OrigDataBlockCorrect1.dataFileList.slice(
      0,
      -1,
    );
    const origDatablocSize = dataFileList
      .map((e) => e.size)
      .reduce((a, v) => {
        return a + v;
      }, 0);
    origDatablockData1Modified = {
      ...TestData.OrigDataBlockCorrect1,
      dataFileList: dataFileList,
      size: origDatablocSize,
    };
    origDatablockData2 = {
      ...TestData.OrigDataBlockCorrect2,
      datasetId: null,
    };
    origDatablockData3 = {
      ...TestData.OrigDataBlockCorrect3,
      datasetId: null,
    };

    origDatablockWithEmptyChkAlg = { ...TestData.OrigDataBlockWrongChkAlg };
  });

  it("0010: adds a first new raw dataset (dataset 1)", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.RawCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("pid").and.be.string;
        // store link to this dataset in datablocks
        datasetPid1 = res.body["pid"];
        encodedDatasetPid1 = encodeURIComponent(datasetPid1);
      });
  });

  it("0020: adds a second new raw dataset (dataset 2)", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.RawCorrectRandom)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("pid").and.be.string;
        // store link to this dataset in datablocks
        datasetPid2 = res.body["pid"];
        encodedDatasetPid2 = encodeURIComponent(datasetPid2);
      });
  });

  it("0030: validate correct origDatablock 1 data used later", async () => {
    origDatablockData1.datasetId = datasetPid1;
    return request(appUrl)
      .post(`/api/v3/origdatablocks/isValid`)
      .send(origDatablockData1)
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

  it("0040: validate wrong origDatablock and expect false", async () => {
    TestData.OrigDataBlockWrong.datasetId = datasetPid1;
    return request(appUrl)
      .post(`/api/v3/origdatablocks/isValid`)
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

  it("0050: adds a new origDatablock with wrong account which should fail", async () => {
    origDatablockData1.datasetId = datasetPid1;
    return request(appUrl)
      .post(`/api/v3/origDatablocks`)
      .send(origDatablockData1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0060: adds a new origDatablock with correct account (origdatablock 1)", async () => {
    origDatablockData1.datasetId = datasetPid1;
    return request(appUrl)
      .post(`/api/v3/origDatablocks`)
      .send(origDatablockData1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData1.size);
        res.body.should.have.property("id").and.be.string;
        origDatablockId1 = res.body["id"];
      });
  });

  it("0070: adds a second origDatablock (origdatablock 2)", async () => {
    origDatablockData2.datasetId = datasetPid1;
    return request(appUrl)
      .post(`/api/v3/origDatablocks`)
      .send(origDatablockData2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData2.size);
        res.body.should.have.property("id").and.be.string;
        origDatablockId2 = res.body["id"];
      });
  });

  it("0080: add a new origDatablock with empty chkAlg should fail", async () => {
    return request(appUrl)
      .post(`/api/v3/origDatablocks`)
      .send(origDatablockWithEmptyChkAlg)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.BadRequestStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("error");
      });
  });

  it("0090: add a new origDatablock with valid chkAlg should success (origdatablock 3)", async () => {
    origDatablockData3.datasetId = datasetPid2;
    return request(appUrl)
      .post(`/api/v3/origDatablocks`)
      .send(origDatablockData3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData3.size);
        res.body.should.have
          .property("chkAlg")
          .and.equal(origDatablockData3.chkAlg);
        res.body.should.have.property("id").and.be.string;
        origDatablockId3 = res.body["id"];
      });
  });

  it("0100: Should fetch all origdatablocks belonging to the new dataset 1", async () => {
    const filter = { where: { datasetId: datasetPid1 } };

    return request(appUrl)
      .get(`/api/v3/origDatablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(2);
        res.body[0]["id"].should.be.oneOf([origDatablockId1, origDatablockId2]);
        res.body[1]["id"].should.be.oneOf([origDatablockId1, origDatablockId2]);
      });
  });

  it("0110: Should fetch all origdatablocks belonging to the new dataset 2", async () => {
    const filter = { where: { datasetId: datasetPid2 } };

    return request(appUrl)
      .get(`/api/v3/origDatablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(1);
        res.body[0]["id"].should.be.oneOf([origDatablockId3]);
      });
  });

  it("0120: Dataset 1 should be the sum of the size of the origDatablocks 1 and 2", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${encodedDatasetPid1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["size"].should.be.equal(
          origDatablockData1.size + origDatablockData2.size,
        );
      });
  });

  it("0130: Dataset 2 should be the size of the origDatablocks 3", async () => {
    return request(appUrl)
      .get(`/api/v3/Datasets/${encodedDatasetPid2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["size"].should.be.equal(origDatablockData3.size);
      });
  });

  it("0140: should fetch dataset 1 including related data", async () => {
    var limits = {
      skip: 0,
      limit: 10,
    };
    var filter = {
      where: {
        pid: datasetPid1,
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
        res.body["pid"].should.be.equal(decodeURIComponent(datasetPid1));
        res.body.origdatablocks.should.be
          .instanceof(Array)
          .and.to.have.length(2);
        res.body.origdatablocks[0].should.have
          .property("dataFileList")
          .and.be.instanceof(Array);
        res.body.origdatablocks[0].dataFileList[0].path.should.oneOf([
          origDatablockData1.dataFileList[0].path,
          origDatablockData2.dataFileList[1].path,
        ]);
        res.body.origdatablocks[0].dataFileList[0].size.should.oneOf([
          origDatablockData1.dataFileList[0].size,
          origDatablockData2.dataFileList[1].size,
        ]);
      });
  });

  it("0150: Should fetch some origDatablock by the full filename and dataset pid from dataset 1", async () => {
    var fields = {
      datasetId: datasetPid1,
      "dataFileList.path": "N1039-B410377.tif",
    };
    var limits = {
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

  it("0160: Should fetch some origDatablock by the partial filename and dataset pid 1", async () => {
    var fields = {
      datasetId: datasetPid1,
      "dataFileList.path": { $regex: "B410" },
    };
    var limits = {
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

  it("0170: Should fetch no origDatablock using a non existing filename", async () => {
    var fields = {
      datasetId: datasetPid1,
      "dataFileList.path": "this_file_does_not_exists.txt",
    };
    var limits = {
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

  it("0190: Should fetch one origDatablock using a specific filename and dataset id", async () => {
    var fields = {
      datasetId: datasetPid1,
      "dataFileList.path": "this_unique_file.txt",
    };
    var limits = {
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

  it("0200: Fetch origDatablock datafiles should include datasetExist field", async () => {
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

  it("0210: Verify that size and numFiles fields are correct in the dataset 1, pass 1", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData1.size + origDatablockData2.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(
            origDatablockData1.dataFileList.length +
              origDatablockData2.dataFileList.length,
          );
      });
  });

  it("0220: Verify that size and numFiles fields are correct in the dataset 2, pass 1", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData3.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(origDatablockData3.dataFileList.length);
      });
  });

  it("0230: should update file list and size of the origdatablock 1", async () => {
    const origDatablock1Updates = {
      size: origDatablockData1Modified.size,
      dataFileList: origDatablockData1Modified.dataFileList,
    };
    return request(appUrl)
      .patch("/api/v3/origdatablocks/" + origDatablockId1)
      .send(origDatablock1Updates)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.be.equal(origDatablockData1Modified.size);
        res.body.should.have
          .property("dataFileList")
          .and.have.length(origDatablockData1Modified.dataFileList.length);
      });
  });

  it("0240: Verify that size and numFiles fields are correct in the dataset 1, pass 2", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData1Modified.size + origDatablockData2.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(
            origDatablockData1Modified.dataFileList.length +
              origDatablockData2.dataFileList.length,
          );
      });
  });

  it("0250: Verify that size and numFiles fields are correct in the dataset 2, pass 2", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData3.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(origDatablockData3.dataFileList.length);
      });
  });

  it("0260: should update file list and size of the origdatablock 1 to original", async () => {
    const origDatablock1Updates = {
      size: origDatablockData1.size,
      dataFileList: origDatablockData1.dataFileList,
    };
    return request(appUrl)
      .patch("/api/v3/origdatablocks/" + origDatablockId1)
      .send(origDatablock1Updates)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.be.equal(origDatablockData1.size);
        res.body.should.have
          .property("dataFileList")
          .and.have.length(origDatablockData1.dataFileList.length);
      });
  });

  it("0270: Verify that size and numFiles fields are correct in the dataset 1, pass 3", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData1.size + origDatablockData2.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(
            origDatablockData1.dataFileList.length +
              origDatablockData2.dataFileList.length,
          );
      });
  });

  it("0280: Verify that size and numFiles fields are correct in the dataset 2, pass 3", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData3.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(origDatablockData3.dataFileList.length);
      });
  });

  it("0290: should delete OrigDatablock 1", async () => {
    return request(appUrl)
      .delete(`/api/v3/OrigDatablocks/${origDatablockId1}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0300: Verify that size and numFiles fields are correct in the dataset 1, pass 4", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData2.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(origDatablockData2.dataFileList.length);
      });
  });

  it("0310: Verify that size and numFiles fields are correct in the dataset 2, pass 4", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData3.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(origDatablockData3.dataFileList.length);
      });
  });

  it("0320: should delete OrigDatablock 2", async () => {
    return request(appUrl)
      .delete(`/api/v3/OrigDatablocks/${origDatablockId2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0330: Verify that size and numFiles fields are correct in the dataset 1, pass 5", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.equal(0);
        res.body.should.have.property("numberOfFiles").and.equal(0);
      });
  });

  it("0340: Verify that size and numFiles fields are correct in the dataset 2, pass 5", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(origDatablockData3.size);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(origDatablockData3.dataFileList.length);
      });
  });

  it("0350: should delete OrigDatablock 3", async () => {
    return request(appUrl)
      .delete(`/api/v3/OrigDatablocks/${origDatablockId3}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0360: Verify that size and numFiles fields are correct in the dataset 1, pass 6", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.equal(0);
        res.body.should.have.property("numberOfFiles").and.equal(0);
      });
  });

  it("0370: Verify that size and numFiles fields are correct in the dataset 2, pass 6", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodedDatasetPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.equal(0);
        res.body.should.have.property("numberOfFiles").and.equal(0);
      });
  });

  it("0380: Should fetch no origdatablocks belonging to the dataset 1", async () => {
    const filter = { where: { datasetId: datasetPid1 } };

    return request(appUrl)
      .get(`/api/v3/origDatablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(0);
      });
  });

  it("0390: Should fetch no origdatablocks belonging to the dataset 2", async () => {
    const filter = { where: { datasetId: datasetPid2 } };

    return request(appUrl)
      .get(`/api/v3/origDatablocks`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(0);
      });
  });

  it("0400: add a new origDatablock to the non-existent dataset should fail", async () => {
    return request(appUrl)
      .post(`/api/v3/origdatablocks`)
      .send({ ...origDatablockData1, datasetId: "wrong" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("error");
      });
  });

  it("0410: should delete the dataset 1", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + encodedDatasetPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0420: should delete the dataset 2", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + encodedDatasetPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });
});
