"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  pid = null,
  foundId1 = null,
  foundId2 = null;

const testraw = {
  principalInvestigator: "bertram.astor@grumble.com",
  endTime: "2011-09-14T06:31:25.000Z",
  creationLocation: "/SU/XQX/RAMJET",
  dataFormat: "Upchuck pre 2017",
  scientificMetadata: {
    beamlineParameters: {
      Monostripe: "Ru/C",
      "Ring current": {
        v: 0.402246,
        u: "A",
      },
      "Beam energy": {
        v: 22595,
        u: "eV",
      },
    },
    detectorParameters: {
      Objective: 20,
      Scintillator: "LAG 20um",
      "Exposure time": {
        v: 0.4,
        u: "s",
      },
    },
    scanParameters: {
      "Number of projections": 1801,
      "Rot Y min position": {
        v: 0,
        u: "deg",
      },
      "Inner scan flag": 0,
      "File Prefix": "817b_B2_",
      "Sample In": {
        v: 0,
        u: "m",
      },
      "Sample folder": "/ramjet/817b_B2_",
      "Number of darks": 10,
      "Rot Y max position": {
        v: 180,
        u: "deg",
      },
      "Angular step": {
        v: 0.1,
        u: "deg",
      },
      "Number of flats": 120,
      "Sample Out": {
        v: -0.005,
        u: "m",
      },
      "Flat frequency": 0,
      "Number of inter-flats": 0,
    },
  },
  owner: "Bertram Astor",
  ownerEmail: "bertram.astor@grumble.com",
  orcidOfOwner: "unknown",
  contactEmail: "bertram.astor@grumble.com",
  sourceFolder: "/iramjet/tif/",
  size: 0,
  packedSize: 12345,
  creationTime: "2011-09-14T06:08:25.000Z",
  description: "None",
  isPublished: false,
  ownerGroup: "p10029",
  accessGroups: [],
  proposalId: "10.540.16635/20110123",
  datasetlifecycle: {
    archivable: true,
    retrievable: false,
    archiveStatusMessage: "datasetIsArchived",
    retrieveStatusMessage: "",
  },
};

const testDataBlock = {
  archiveId:
    "3oneCopyBig/p10029/raw/2018/01/23/20.500.11935/07e8a14c-f496-42fe-b4b4-9ff41061695e_1_2018-01-23-03-11-34.tar",
  size: 41780190,
  packedSize: 41780190,
  chkAlg: "sha1",
  version: "0.6.0",
  dataFileList: [
    {
      path: "N1039__B410489.tif",
      size: 8356038,
      time: "2017-07-24T13:56:30.000Z",
      chk: "652810fb470a0c90456912c0a3351e2f6d7325e4",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
    {
      path: "N1039__B410613.tif",
      size: 8356038,
      time: "2017-07-24T13:56:35.000Z",
      chk: "9fc6640a4cdb97c8389aa9613f4aeabe8ef681ef",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
    {
      path: "N1039__B410729.tif",
      size: 8356038,
      time: "2017-07-24T13:56:41.000Z",
      chk: "908fe1a942aabf63d5dfa3d0a5088eeaf02c79cf",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
    {
      path: "N1039__B410200.tif",
      size: 8356038,
      time: "2017-07-24T13:56:18.000Z",
      chk: "ee86aafec6258ff95961563435338e79a1ccb04d",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
    {
      path: "N1039__B410377.tif",
      size: 8356038,
      time: "2017-07-24T13:56:25.000Z",
      chk: "44cae8b9cb4bc732f04225371203af884af621d7",
      uid: "egon.meiera@psi.ch",
      gid: "p16738",
      perm: "-rw-rw-r--",
    },
  ],
  ownerGroup: "p10029",
};

const testArchiveId2 =
  "oneCopyBig/p10029/raw/2018/01/23/20.500.11935/07e8a14c-f496-42fe-b4b4-9ff410616xxx_1_2018-01-23-03-11-34.tar";

describe("2100: ResetDataset: Create Dataset and its Datablocks, then reset Datablocks and embedded Datasetlifecycle status", () => {
  before(async () => {
    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  // first get existing datasets with the test archieId to allow to delete them

  // TODO: Check all the tests here and fix if they are needed.
  // NOTE: Not sure if this one is still needed because we don't have a way to do this in the new backend.
  // it("should retrieve existing Datablocks with specific archiveId, if any", async () => {
  //   return request(appUrl)
  //     .get(
  //       "/api/v3/datasets//Datablocks?filter=%7B%22where%22%3A%7B%22archiveId%22%3A%22" +
  //         encodeURIComponent(testDataBlock.archiveId) +
  //         "%22%7D%7D",
  //     )
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       foundId1 = res.body[0] ? res.body[0].id : null;
  //     });
  // });

  // // NOTE: Not sure if this one is still needed because we don't have a way to do this in the new backend.
  // it("should retrieve existing Datablocks with 2nd specific archiveId, if any", async () => {
  //   return request(appUrl)
  //     .get(
  //       "/api/v3/Datablocks?filter=%7B%22where%22%3A%7B%22archiveId%22%3A%22" +
  //         encodeURIComponent(testArchiveId2) +
  //         "%22%7D%7D",
  //     )
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       foundId2 = res.body[0] ? res.body[0].id : null;
  //     });
  // });

  // it("should delete existing Datablocks (usually none) with specific archiveId", async () => {
  //   if (foundId1) {
  //     return request(appUrl)
  //       .delete("/api/v3/Datablocks/" + foundId1)
  //       .set("Accept", "application/json")
  //       .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
  //       .expect(200)
  //       .expect("Content-Type", /json/);
  //   } else {
  //     return;
  //   }
  // });

  // it("should delete existing Datablocks (usually none) with 2nd specific archiveId", async () => {
  //   if (foundId2) {
  //     return request(appUrl)
  //       .delete("/api/v3/Datablocks/" + foundId2)
  //       .set("Accept", "application/json")
  //       .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
  //       .expect(200)
  //       .expect("Content-Type", /json/);
  //   } else {
  //     return;
  //   }
  // });

  // it("adds a new raw dataset", async () => {
  //   return request(appUrl)
  //     .post("/api/v3/RawDatasets")
  //     .send(testraw)
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body.should.have.property("owner").and.be.string;
  //       res.body.should.have.property("type").and.equal("raw");
  //       res.body.should.have.property("pid").and.be.string;
  //       res.body.should.have.property("createdBy").and.equal("ingestor");
  //       // store link to this dataset in datablocks
  //       testDataBlock.datasetId = res.body["pid"];
  //       pid = encodeURIComponent(res.body["pid"]);
  //     });
  // });

  // it("adds a new datablock", async () => {
  //   return request(appUrl)
  //     .post("/api/v3/Datablocks")
  //     .send(testDataBlock)
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body.should.have.property("size");
  //       res.body.should.have.property("id").and.be.string;
  //       res.body.should.have.property("createdBy").and.equal("archiveManager");
  //     });
  // });

  // it("adds a second datablock for same dataset", async () => {
  //   testDataBlock.archiveId = testArchiveId2;
  //   return request(appUrl)
  //     .post("/api/v3/Datablocks")
  //     .send(testDataBlock)
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body.should.have.property("size");
  //       res.body.should.have.property("id").and.be.string;
  //     });
  // });

  // it("Should fetch all datablocks belonging to the new dataset", async () => {
  //   return request(appUrl)
  //     .get("/api/v3/Datasets/" + pid)
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body.should.be.instanceof(Array).and.to.have.length(2);
  //     });
  // });

  // it("should reset the archive information from the newly created dataset", async () => {
  //   return request(appUrl)
  //     .put("/api/v3/Datasets/resetArchiveStatus")
  //     .send({
  //       datasetId: testDataBlock.datasetId,
  //     })
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/);
  // });

  // it("The archive Status Message should now be reset", async () => {
  //   return request(appUrl)
  //     .get("/api/v3/Datasets/" + pid)
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body.should.be.instanceof(Object);
  //       res.body.should.have.nested
  //         .property("datasetlifecycle.archiveStatusMessage")
  //         .and.equal("datasetCreated");
  //       res.body.should.have.nested
  //         .property("datasetlifecycle.retrieveStatusMessage")
  //         .and.equal("");
  //     });
  // });

  // it("There should be no datablocks any more for this dataset", async () => {
  //   return request(appUrl)
  //     .get("/api/v3/Datasets/" + pid + "/datablocks/count")
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body.should.be.instanceof(Object);
  //       res.body.count.should.be.equal(0);
  //     });
  // });

  // it("should check createdBy and updatedBy fields of the newly created dataset", async () => {
  //   return request(appUrl)
  //     .get("/api/v3/Datasets/" + pid)
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body.should.be.instanceof(Object);
  //       res.body.should.have.property("createdBy").and.equal("ingestor");
  //       res.body.should.have.property("updatedBy").and.equal("archiveManager");
  //     });
  // });

  // it("should delete the newly created dataset", async () => {
  //   return request(appUrl)
  //     .delete("/api/v3/Datasets/" + pid)
  //     .set("Accept", "application/json")
  //     .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
  //     .expect(200)
  //     .expect("Content-Type", /json/);
  // });
});
