"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const sandbox = require("sinon").createSandbox();

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  accessTokenUser3 = null,
  accessTokenArchiveManager = null,
  instrumentPid1 = null,
  encodedInstrumentPid1 = null,
  instrumentPid2 = null,
  encodedInstrumentPid2 = null,
  instrumentPid3 = null,
  encodedInstrumentPid3 = null,
  instrumentPid4 = null,
  encodedInstrumentPid4 = null;

const InstrumentCorrect1 = {
  ...TestData.InstrumentCorrect1,
  name: "ESS instrument one",
};

const InstrumentCorrect2 = {
  ...TestData.InstrumentCorrect2,
  name: "ESS instrument two",
};

const InstrumentCorrect3 = {
  ...TestData.InstrumentCorrect3,
  name: "Another instrument at ESS, number three",
};

const InstrumentCorrect4 = {
  ...TestData.InstrumentCorrect3,
  uniqueName: "ESS3-2",
  name: "Yet another instrument at ESS, a new number three different from the other",
};

describe("1000: InstrumentFilter: Test retrieving instruments using filtering capabilities", () => {
  before(async () => {
    await db.collection("Instrument").deleteMany({});

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

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  afterEach((done) => {
    sandbox.restore();
    done();
  });

  it("0010: adds instrument 1 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(InstrumentCorrect1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.equal(InstrumentCorrect1.name);
        instrumentPid1 = res.body["pid"];
        encodedInstrumentPid1 = encodeURIComponent(instrumentPid1);
      });
  });

  it("0020: adds instrument 2 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(InstrumentCorrect2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.equal(InstrumentCorrect2.name);
        instrumentPid2 = res.body["pid"];
        encodedInstrumentPid2 = encodeURIComponent(instrumentPid2);
      });
  });

  it("0030: adds instrument 3 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(InstrumentCorrect3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.equal(InstrumentCorrect3.name);
        instrumentPid3 = res.body["pid"];
        encodedInstrumentPid3 = encodeURIComponent(instrumentPid3);
      });
  });

  it("0040: adds instrument 4 as Admin Ingestor", async () => {
    return request(appUrl)
      .post("/api/v3/Instruments")
      .send(InstrumentCorrect4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("name")
          .and.equal(InstrumentCorrect4.name);
        instrumentPid4 = res.body["pid"];
        encodedInstrumentPid4 = encodeURIComponent(instrumentPid4);
      });
  });

  it("0050: retrieve single instrument by its name", async () => {
    const query = { where: { name: InstrumentCorrect1.name } };
    return request(appUrl)
      .get("/api/v3/Instruments")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(instrumentPid1);
      });
  });

  it('0060: retrieve instruments with "ESS instrument" in name using loopback style "like" operator', async () => {
    const query = { where: { name: { like: "ESS instrument" } } };
    return request(appUrl)
      .get("/api/v3/Instruments")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
      });
  });

  it('0065: retrieve instruments with "ESS instrument" in name using loopback style "ilike" operator', async () => {
    const query = { where: { name: { ilike: "ess instrument" } } };
    return request(appUrl)
      .get("/api/v3/Instruments")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
      });
  });

  // it("0070: count how many instruments with \"ESS instrument\" in name using loopback style \"like\" operator", async () => {
  //   const query = { where: { name: { like: "ESS instrument" }}};
  //   return request(appUrl)
  //     .get("/api/v3/Instruments/count")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .query("filter=" + encodeURIComponent(JSON.stringify(query)))
  //     .set("Accept", "application/json")
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body["count"].should.be.equal(2);
  //     });
  // });

  it('0080: retrieve one instrument with "ESS instrument" in name using loopback style "like" operator', async () => {
    const query = { where: { name: { like: "ESS instrument" } } };
    return request(appUrl)
      .get("/api/v3/Instruments/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([instrumentPid1, instrumentPid2]);
      });
  });

  it('0090: retrieve instruments with "ESS instrument" in instrument name using mongo regex operator', async () => {
    const query = { where: { name: { $regex: "ESS instrument" } } };
    return request(appUrl)
      .get("/api/v3/instruments")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
      });
  });

  // it("0100: count how many instruments with \"ESS instrument\" in instrument name using mongo regex operator", async () => {
  //   const query = { where: { name: { "$regex": "ESS instrument" }}};
  //   return request(appUrl)
  //     .get("/api/v3/instruments/count")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .query("filter=" + encodeURIComponent(JSON.stringify(query)))
  //     .set("Accept", "application/json")
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body["count"].should.be.equal(3);
  //     });
  // });

  it('0110: retrieve one instruments with "ESS instrument" in instrument name using mongo regex operator', async () => {
    const query = { where: { name: { $regex: "ESS instrument" } } };
    return request(appUrl)
      .get("/api/v3/instruments/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([instrumentPid1, instrumentPid2]);
      });
  });

  it('0120: retrieve instruments with "Another instrument" in instrument name using loopback style "like" operator', async () => {
    const query = { where: { name: { like: "Another instrument" } } };
    return request(appUrl)
      .get("/api/v3/instruments")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(instrumentPid3);
      });
  });

  it('0130: retrieve one instrument with "Another instrument" in instrument name using loopback style "like" operator', async () => {
    const query = { where: { name: { like: "Another instrument" } } };
    return request(appUrl)
      .get("/api/v3/instruments/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.equal(instrumentPid3);
      });
  });

  // it("0140: count how many instruments with \"Another instrument\" in instrument name using loopback style \"like\" operator", async () => {
  //   const query = { where: { name: { like: "Another instrument" }}};
  //   return request(appUrl)
  //     .get("/api/v3/instruments/count")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .query("filter=" + encodeURIComponent(JSON.stringify(query)))
  //     .set("Accept", "application/json")
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body["count"].should.be.equal(1);
  //     });
  // });

  it('0150: retrieve instruments with "Another instrument" in instrument name using mongo "regex" operator', async () => {
    const query = { where: { name: { $regex: "Another instrument" } } };
    return request(appUrl)
      .get("/api/v3/instruments")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(1);
        res.body[0]["pid"].should.be.equal(instrumentPid3);
      });
  });

  it('0160: retrieve one instrument with "Another instrument" in instrument name using mongo "regex" operator', async () => {
    const query = { where: { name: { $regex: "Another instrument" } } };
    return request(appUrl)
      .get("/api/v3/instruments/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.equal(instrumentPid3);
      });
  });

  // it("0170: count how many instruments with \"Another instrument\" in instrument name using mongo \"regex\" operator", async () => {
  //   const query = { where: { name: { "$regex": "Another instrument" }}};
  //   return request(appUrl)
  //     .get("/api/v3/instruments/count")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .query("filter=" + encodeURIComponent(JSON.stringify(query)))
  //     .set("Accept", "application/json")
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body["count"].should.be.equal(1);
  //     });
  // });

  it('0180: retrieve instruments with "another" and "instrument" in name using "regex" operator', async () => {
    const query = { where: { name: { $regex: "[Aa]nother instrument" } } };
    return request(appUrl)
      .get("/api/v3/instruments")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf(2);
        res.body[0]["pid"].should.be.oneOf([instrumentPid3, instrumentPid4]);
        res.body[1]["pid"].should.be.oneOf([instrumentPid3, instrumentPid4]);
      });
  });

  it('0190: retrieve one instrument with "another" and "instrument" in description using "regex" operator', async () => {
    const query = { where: { name: { $regex: "[Aa]nother instrument" } } };
    return request(appUrl)
      .get("/api/v3/instruments/findOne")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query("filter=" + encodeURIComponent(JSON.stringify(query)))
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body["pid"].should.be.oneOf([instrumentPid3, instrumentPid4]);
      });
  });

  // it("0200: count how many instruments with \"another\" and \"instrument\" in description using \"regex\" operator", async () => {
  //   const query = { where: { name: { "$regex": "[Aa]nother] instrument" }}};
  //   return request(appUrl)
  //     .get("/api/v3/instruments/count")
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .query("filter=" + encodeURIComponent(JSON.stringify(query)))
  //     .set("Accept", "application/json")
  //     .expect("Content-Type", /json/)
  //     .then((res) => {
  //       res.body["count"].should.be.equal(2);
  //     });
  // });

  it("0210: should delete instrument 1", async () => {
    return request(appUrl)
      .delete("/api/v3/instruments/" + instrumentPid1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0220: should delete instrument 2", async () => {
    return request(appUrl)
      .delete("/api/v3/instruments/" + instrumentPid2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0230: should delete instrument 3", async () => {
    return request(appUrl)
      .delete("/api/v3/instruments/" + instrumentPid3)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0240: should delete instrument 4", async () => {
    return request(appUrl)
      .delete("/api/v3/instruments/" + instrumentPid4)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });
});
