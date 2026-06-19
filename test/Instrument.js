"use strict";
const assert = require("node:assert");
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null,

  instrumentId1 = null,
  encodedInstrumentId1 = null,
  instrumentId2 = null,
  encodedInstrumentId2 = null,
  instrumentId3 = null,
  encodedInstrumentId3 = null;

const newName = "ESS3-1";

describe("0900: Instrument: instrument management, creation, update, deletion and search", () => {
  before(async () => {
    db.collection("Instrument").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  it("0010: adds new instrument #1 as ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(TestData.InstrumentCorrect1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.be.equal(TestData.InstrumentCorrect1.name);
        res.body.should.have.property("pid").and.be.string;
        instrumentId1 = res.body["pid"];
        encodedInstrumentId1 = encodeURIComponent(instrumentId1);
      });
  });

  it("0020: adds new instrument #2 as ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(TestData.InstrumentCorrect2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.be.equal(TestData.InstrumentCorrect2.name);
        res.body.should.have.property("pid").and.be.string;
        instrumentId2 = res.body["pid"];
        encodedInstrumentId2 = encodeURIComponent(instrumentId2);
      });
  });

  it("0030: adds new instrument #3 as ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(TestData.InstrumentCorrect3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.be.equal(TestData.InstrumentCorrect3.name);
        res.body.should.have.property("pid").and.be.string;
        instrumentId3 = res.body["pid"];
        encodedInstrumentId3 = encodeURIComponent(instrumentId3);
      });
  });

  it("0040: adds instrument #2 again as ingestor, which should fail because uniqueName is not unique", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(TestData.InstrumentCorrect2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.ConflictStatusCode);
  });

  it("0050: adds invalid instrument as ingestor, which should fail because it is missing the uniqeName", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(TestData.InstrumentWrong1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.BadRequestStatusCode);
  });

  it("0060: adds instrument #2 as user1 (non admin), which should fail", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(TestData.InstrumentCorrect2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("0070: should fetch instrument #1 as ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Instruments/" + instrumentId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.be.equal(TestData.InstrumentCorrect1.name);
        res.body.should.have.property("pid").and.be.equal(instrumentId1);
      });
  });

  it("0080: should fetch instrument #2 as ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Instruments/" + instrumentId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.be.equal(TestData.InstrumentCorrect2.name);
        res.body.should.have.property("pid").and.be.equal(instrumentId2);
      });
  });

  it("0090: should fetch all instruments as ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Instruments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.length(3);
      });
  });

  it("0100: should fetch all instruments with main_user as ESS as ingestor", async () => {
    const filter = {
      where: {
        "customMetadata.main_user": "ESS",
      },
    };

    return request(appUrl)
      .get("/api/v3/Instruments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.length(2);
        res.body.forEach((v) => {
          v.customMetadata.main_user.should.be.equal("ESS");
        });
      });
  });

  it("0110: should fetch one instruments as ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Instruments/findOne")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.pid.should.be.oneOf([
          instrumentId1,
          instrumentId2,
          instrumentId3,
        ]);
      });
  });

  it("0120: should fetch one instruments with main_user as ESS as admin", async () => {
    const filter = {
      where: {
        "customMetadata.main_user": "ESS",
      },
    };

    return request(appUrl)
      .get("/api/v3/Instruments/findOne")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.pid.should.be.oneOf([instrumentId1, instrumentId2]);
        res.body.customMetadata.main_user.should.be.equal("ESS");
      });
  });

  it("0130: should fetch all instruments which main user containing the word 'somebody' as ingestor", async () => {
    const filter = {
      where: {
        "customMetadata.main_user": { like: "somebody" },
      },
    };

    return request(appUrl)
      .get("/api/v3/Instruments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.length(1);
        res.body[0].pid.should.be.equal(instrumentId3);
        res.body[0].customMetadata.main_user.should.be.contain("somebody");
      });
  });

  it("0140: should fetch all instruments as user1", async () => {
    return request(appUrl)
      .get("/api/v3/Instruments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.length(3);
      });
  });

  it("0150: should update name for instrument #2 as ingestor", async () => {
    return request(appUrl)
      .patch("/api/v3/Instruments/" + instrumentId2)
      .send({ name: newName })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("name").and.be.equal(newName);
        res.body.should.have.property("pid").and.be.equal(instrumentId2);
      });
  });

  it("0155: update unique name for instrument #2 as ingestor to ESS3-1, which should fail becuase is not unique ", async () => {
    return request(appUrl)
      .patch("/api/v3/Instruments/" + instrumentId2)
      .send({ uniqueName: newName })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.BadRequestStatusCode);
  });

  it("0160: should fetch same instrument by id as ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Instruments/" + instrumentId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("name").and.be.equal(newName);
        res.body.should.have.property("pid").and.be.equal(instrumentId2);
      });
  });

  it("0170: should fetch same instrument by name", async () => {
    const filter = {
      where: {
        name: newName,
      },
    };

    return request(appUrl)
      .get("/api/v3/Instruments/")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.length(1);
        res.body.forEach((v) => {
          v.should.have.property("name").and.be.equal(newName);
          v.should.have.property("pid").and.be.equal(instrumentId2);
        });
      });
  });

  it("0180: should delete instrument #1 as admin, which should fail", async () => {
    return request(appUrl)
      .delete("/api/v3/Instruments/" + instrumentId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("0190: should delete instrument #1 as user allowed to delete", async () => {
    return request(appUrl)
      .delete("/api/v3/Instruments/" + instrumentId1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0200: should delete instrument #2 as user allowed to delete", async () => {
    return request(appUrl)
      .delete("/api/v3/Instruments/" + instrumentId2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0210: should delete instrument #3 as user allowed to delete", async () => {
    return request(appUrl)
      .delete("/api/v3/Instruments/" + instrumentId3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });
});

describe("0900: Instrument: Optimistic concurrency control tests", () => {
  before(async () => {
    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });
  });

  it("0900: should fail one request with HTTP 412 when two requests try to update the same instrument", async () => {
    const instrument = {
      ...TestData.InstrumentCorrect1,
      uniqueName: "OCC-Test-Instrument",
    };
    const res = await request(appUrl)
      .post("/api/v3/Instruments")
      .send(instrument)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode);
    const id = res.body.pid;

    const [res1, res2] = await Promise.all([
      request(appUrl)
        .patch(`/api/v3/Instruments/${id}`)
        .send({ name: "Updated name 1" })
        .set("if-unmodified-since", res.body.updatedAt)
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` }),
      request(appUrl)
        .patch(`/api/v3/Instruments/${id}`)
        .send({ name: "Updated name 2" })
        .set("if-unmodified-since", res.body.updatedAt)
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` }),
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
