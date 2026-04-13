"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,

  datasetId = null,
  ownerGroup = null,
  datablockId = null,
  datablockId2 = null;

describe("Datablocks", () => {
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
  });

  it("0010: adds a datablock to an existing dataset", async () => {
    await request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.RawCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
  
    await request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.RawCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("pid").and.be.a("string");
        datasetId = res.body["pid"];
        ownerGroup = res.body["ownerGroup"];
      });

    return request(appUrl)
      .post(`/api/v3/datablocks`)
      .send({ ...TestData.DataBlockCorrect, datasetId, ownerGroup })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(TestData.DataBlockCorrect.size);
        res.body.should.have.property("id").and.be.a("string");
        datablockId = res.body["id"];
      });
  });

  it("0020: adds the same datablock again which should fail because it is already stored", async () => {
    return request(appUrl)
      .post(`/api/v3/datablocks`)
      .send({ ...TestData.DataBlockCorrect, datasetId, ownerGroup })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.ConflictStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.should.have.property("error");
      });
  });

  it("0030: adds a new datablock which should fail because wrong functional account", async () => {
    return request(appUrl)
      .post(`/api/v3/datablocks`)
      .send({
        ...TestData.DataBlockCorrect,
        archiveId: "New archive Id",
        datasetId,
        ownerGroup,
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.AccessForbiddenStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.should.have.property("error");
      });
  });

  it("0040: adds a second datablock for same dataset", async () => {
    return request(appUrl)
      .post(`/api/v3/datablocks`)
      .send({
        ...TestData.DataBlockCorrect,
        archiveId: "New archive Id",
        datasetId,
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size");
        res.body.should.have.property("id").and.be.a("string");
        res.body.should.have.property("ownerGroup").and.equal(ownerGroup);
        datablockId2 = res.body["id"];
      });
  });

  it("0050: should fetch datablocks associated with dataset", async () => {
    var filter = { where: { datasetId: datasetId } };

    return request(appUrl)
      .get(
        `/api/v3/datablocks?filter= ${encodeURIComponent(JSON.stringify(filter))} `,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(2);
        res.body[0].should.have
          .property("dataFileList")
          .and.be.instanceof(Array)
          .and.to.have.length(TestData.DataBlockCorrect.dataFileList.length);
      });
  });

  it("0060: The size and numFiles fields in the dataset should be correctly updated", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodeURIComponent(datasetId))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(0);
        res.body.should.have
          .property("packedSize")
          .and.equal(TestData.DataBlockCorrect.packedSize * 2);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(0);
        res.body.should.have
          .property("numberOfFilesArchived")
          .and.equal(TestData.DataBlockCorrect.dataFileList.length * 2);
      });
  });

  it("0070: should delete first datablock", async () => {
    return request(appUrl)
      .delete(`/api/v3/datablocks/${datablockId}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0080: The size and numFiles fields in the dataset should be correctly updated", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodeURIComponent(datasetId))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("size")
          .and.equal(0);
        res.body.should.have
          .property("packedSize")
          .and.equal(TestData.DataBlockCorrect.packedSize);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(0);
        res.body.should.have
          .property("numberOfFilesArchived")
          .and.equal(TestData.DataBlockCorrect.dataFileList.length);
      });
  });

  it("0090: should delete second datablock", async () => {
    return request(appUrl)
      .delete(`/api/v3/datablocks/${datablockId2}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0100: The size and numFiles fields in the dataset should be correctly updated", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + encodeURIComponent(datasetId))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("packedSize").and.equal(0);
        res.body.should.have.property("numberOfFilesArchived").and.equal(0);
      });
  });

  it("0110: should delete the newly created dataset", async () => {
    return request(appUrl)
      .delete(`/api/v3/Datasets/${encodeURIComponent(datasetId)}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  describe("History tracking tests for Datablocks", () => {
    let historyDatablockId = null;
    let historyDatasetId = null;
    let historyOwnerGroup = null;
    let originalSize = 123456;
    it("1000: should create a dataset and a datablock with minimal data", async () => {
      // First create a dataset to associate with the datablock
      const datasetResponse = await request(appUrl)
        .post("/api/v3/Datasets")
        .send(TestData.RawCorrect)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/);

      historyDatasetId = datasetResponse.body.pid;
      historyOwnerGroup = datasetResponse.body.ownerGroup;

      // Use TestData.DataBlockCorrect as base to ensure all required fields are included
      const minimalDatablock = {
        ...TestData.DataBlockCorrect, // Include all required fields from working example
        datasetId: historyDatasetId, // Override with our specific values
        ownerGroup: historyOwnerGroup,
        size: originalSize,
        archiveId: "original-archive-id",
      };

      return request(appUrl)
        .post(`/api/v3/datablocks`)
        .send(minimalDatablock)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("id").and.be.a("string");
          historyDatablockId = res.body.id;
        });
    });

    it("1010: should update datablock with new archiveId and size", async () => {
      const updatePayload = {
        archiveId: "994394",
        size: 737243,
      };

      return request(appUrl)
        .patch(`/api/v3/datablocks/${historyDatablockId}`)
        .send(updatePayload)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          // Verify the datablock was updated correctly
          res.body.should.be.a("object");
          res.body.should.have
            .property("archiveId")
            .equal(updatePayload.archiveId);
          res.body.should.have.property("size").equal(updatePayload.size);
        });
    });

    it("1020: should verify datablock was updated correctly", async () => {
      return request(appUrl)
        .get(`/api/v3/datablocks/${historyDatablockId}`)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("archiveId").equal("994394");
          res.body.should.have.property("size").equal(737243);
        });
    });

    it("1030: should verify history contains the before and after values", async () => {
      // Wait a moment for history to be updated
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Then get the history data for this datablock
      return request(appUrl)
        .get(`/api/v3/history`)
        .query({
          filter: JSON.stringify({
            subsystem: "Datablock",
            documentId: historyDatablockId,
          }),
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          // History should be an object with items array
          res.body.should.be.an("object");
          res.body.should.have.property("items").that.is.an("array");
          res.body.items.should.have.length.greaterThan(0);

          // Find the update operation in the history
          const updateHistory = res.body.items.find(
            (h) => h.operation === "update",
          );
          should.exist(updateHistory);

          // Verify history contains the document ID
          updateHistory.should.have
            .property("documentId")
            .equal(historyDatablockId);

          // Verify the history contains the before and after values
          updateHistory.should.have.property("before");
          updateHistory.should.have.property("after");

          // Before should have the original values
          updateHistory.before.should.have
            .property("archiveId")
            .equal("original-archive-id");
          updateHistory.before.should.have.property("size").equal(originalSize);

          // After should have the updated values
          updateHistory.after.should.have.property("archiveId").equal("994394");
          updateHistory.after.should.have.property("size").equal(737243);
        });
    });

    after("1040: cleanup - delete the test datablock and dataset", async () => {
      try {
        if (historyDatablockId) {
          await request(appUrl)
            .delete(`/api/v3/datablocks/${historyDatablockId}`)
            .set("Accept", "application/json")
            .set({ Authorization: `Bearer ${accessTokenArchiveManager}` }) // Use archiveManager instead
            .expect(TestData.SuccessfulDeleteStatusCode);
        }

        if (historyDatasetId) {
          await request(appUrl)
            .delete(`/api/v3/Datasets/${encodeURIComponent(historyDatasetId)}`)
            .set("Accept", "application/json")
            .set({ Authorization: `Bearer ${accessTokenArchiveManager}` }) // Use archiveManager instead
            .expect(TestData.SuccessfulDeleteStatusCode);
        }
      } catch (error) {
        // Add error logging but don't fail the test on cleanup errors
        console.log(`Warning: Cleanup failed: ${error.message}`);
      }
    });
  });
});
