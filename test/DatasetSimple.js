"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  countDataset = 0,
  countRawDataset = 0,
  countDerivedDataset = 0,
  pidRaw1 = null,
  pidRaw2 = null,
  pidDerived1 = null,
  policyIds = [];

describe("0200: Dataset Simple: Check different dataset types and their inheritance", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  function deleteDataset(item) {
    const response = request(appUrl)
      .delete("/api/v3/datasets/" + encodeURIComponent(item.pid))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode);

    return response;
  }

  function deleteAllDatasets(array) {
    for (const item of array) {
      deleteDataset(item);
    }
  }

  async function deletePolicy(item) {
    const response = await request(appUrl)
      .delete("/api/v3/Policies/" + encodeURIComponent(item.pid))
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);

    return response;
  }

  it("0001: delete all dataset as archivemanager", async () => {
    return await request(appUrl)
      .get("/api/v3/datasets")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then(async (res) => {
        return deleteAllDatasets(res.body);
      });
  });

  it("0002: delete all policies as archivemanager", async () => {
    return await request(appUrl)
      .get("/api/v3/policies")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then(async (res) => {
        return await res.body.forEach(async (d) => {
          return await deletePolicy(d);
        });
      });
  });

  // get counts which should be all zero as the database is empty
  it("0010: should get count of datasets", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.be.a("number");
        res.body.count.should.be.equal(0);
        countDataset = res.body.count;
      });
  });

  it("0020: should get count of raw datasets", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ where: { type: "raw" } })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.be.a("number");
        res.body.count.should.be.equal(0);
        countRawDataset = res.body.count;
      });
  });

  it("0030: should get count of derived datasets", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ where: { type: "derived" } })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.be.a("number");
        res.body.count.should.be.equal(0);
        countDerivedDataset = res.body.count;
      });
  });

  // check if dataset is valid
  it("0040: check if raw dataset is valid", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets/isValid")
      .send(TestData.RawCorrect)
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(true);
      });
  });

  it("0050: check if derived dataset is valid", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets/isValid")
      .send(TestData.DerivedCorrect)
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(true);
      });
  });

  it("0060: check if wrong derived dataset is recognized as invalid", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets/isValid")
      .send(TestData.DerivedWrong)
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set("Accept", "application/json")
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(false);
      });
  });

  it("0070: check if wrong typed dataset is recognized as invalid", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets/isValid")
      .send(TestData.DatasetWrong)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("valid").and.equal(false);
      });
  });

  // add dataset and check what happened to counts
  it("0080: adds a new raw dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.RawCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("__v").and.to.be.a("number");
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("pid").and.be.string;
        res.body.should.have
          .property("ownerEmail")
          .and.equal(TestData.RawCorrect.ownerEmail);
        pidRaw1 = encodeURIComponent(res.body.pid);
      });
  });

  it("0081: raw dataset should contain scientific metadata quantity range and correct ValueSI and UnitSI", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + pidRaw1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("scientificMetadata")
          .and.to.be.a("object");

        const scientificMetadata = res.body.scientificMetadata;

        scientificMetadata.should.have
          .property("approx_distance_range")
          .and.to.be.a("object");

        const approxDistanceRange = scientificMetadata.approx_distance_range;
        approxDistanceRange.should.have
          .property("unitSI")
          .and.to.be.a("string")
          .and.equal("m");
        approxDistanceRange.should.have
          .property("valueSI")
          .and.to.be.a("array");
        approxDistanceRange.should.have.property("value").and.to.be.a("array");
        const valueSI = approxDistanceRange.valueSI;
        const value = approxDistanceRange.value;

        value.should.have.lengthOf(2);
        value[0].should.be.a("number").and.equal(1);
        value[1].should.be.a("number").and.equal(2);

        valueSI.should.have.lengthOf(2);
        valueSI[0].should.be.a("number").and.equal(0.01);
        valueSI[1].should.be.a("number").and.equal(0.02);
      });
  });

  // get counts again
  it("0090: check for correct new count of datasets", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.to.be.a("number");
        (res.body.count - countDataset).should.equal(1);
      });
  });

  it("0100: check for count of raw datasets which should be 1", async () => {
    const filter = { where: { type: "raw" } };

    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.to.be.a("number");
        (res.body.count - countRawDataset).should.equal(1);
      });
  });

  it("0110: check for unchanged count of derived datasets", async () => {
    const filter = { where: { type: "derived" } };
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.to.be.a("number");
        (res.body.count - countDerivedDataset).should.equal(0);
      });
  });

  it("0120: should add a second raw dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.RawCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("__v").and.to.be.a("number");
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("pid").and.be.string;

        pidRaw2 = encodeURIComponent(res.body.pid);
      });
  });

  it("0130: new dataset count should be incremented", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.to.be.a("number");
        (res.body.count - countDataset).should.equal(2);
      });
  });

  it("0140: new raw dataset count should be incremented", async () => {
    const filter = { where: { type: "raw" } };

    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.to.be.a("number");
        (res.body.count - countRawDataset).should.equal(2);
      });
  });

  it("0150: new derived dataset count should be unchanged", async () => {
    const filter = { where: { type: "derived" } };

    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.to.be.a("number");
        (res.body.count - countDerivedDataset).should.equal(0);
      });
  });

  it("0160: adds a new derived dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.DerivedCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("__v").and.to.be.a("number");
        res.body.should.have.property("type").and.equal("derived");
        res.body.should.have.property("pid").and.be.string;
        pidDerived1 = encodeURIComponent(res.body["pid"]);
      });
  });

  it("0170: new dataset count should be incremented", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((err, res) => {
        if (err) return err;
        res.body.should.have.property("count").and.be.a("number");
        (res.body.count - countDataset).should.equal(3);
      });
  });

  it("0190: new raw dataset count should be unchanged", async () => {
    const filter = { where: { type: "raw" } };

    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((err, res) => {
        if (err) return err;
        res.body.should.have.property("count").and.be.a("number");
        (res.body.count - countRawDataset).should.equal(2);
      });
  });

  it("0200: new derived dataset count should be incremented", async () => {
    const filter = { where: { type: "derived" } };

    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((err, res) => {
        if (err) return err;
        res.body.should.have.property("count").and.be.a("number");
        (res.body.count - countDerivedDataset).should.equal(1);
      });
  });

  it("0205: check for the default policies to have been created", async () => {
    return request(appUrl)
      .get(`/api/v3/Policies`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").to.have.lengthOf.at.least(1);
      });
  });

  it("0210: should delete the first raw dataset", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + pidRaw1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((err) => {
        if (err) return err;
      });
  });

  it("0220: should delete the second raw dataset", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + pidRaw2)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((err) => {
        if (err) return err;
      });
  });

  it("0230: should delete the derived dataset", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + pidDerived1)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((err) => {
        if (err) return err;
      });
  });

  it("0240: check for the default policies to have been created", async () => {
    // Query only newly created ones by the tests. This way we prevent removing all the policies that exist before the tests were run.
    const start = new Date();
    start.setHours(start.getHours(), 0, 0, 0);
    const filter = { where: { createdAt: { $gte: start } } };

    return request(appUrl)
      .get(
        `/api/v3/Policies?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array");
        //res.body.should.be.an("array").to.have.lengthOf(2);
        policyIds = res.body.map((x) => x["_id"]);
      });
  });

  it("0250: should delete the default policies created with datasets", async () => {
    for (const item of policyIds) {
      await request(appUrl)
        .delete("/api/v3/policies/" + item)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
        .expect(TestData.SuccessfulDeleteStatusCode);
    }
  });

  it("0260: new dataset count should be back to old count", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((err, res) => {
        if (err) return err;
        res.body.should.have.property("count").and.be.a("number");
        (res.body.count - countDataset).should.equal(0);
      });
  });

  it("0270: new raw dataset count should be back to old count", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ where: { type: "raw" } })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((err, res) => {
        if (err) return err;
        res.body.should.have.property("count").and.be.a("number");
        (res.body.count - countRawDataset).should.equal(0);
      });
  });

  it("0280: new derived dataset count should be back to old count", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .query({ where: { type: "derived" } })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((err, res) => {
        if (err) return err;
        res.body.should.have.property("count").and.be.a("number");
        (res.body.count - countDerivedDataset).should.equal(0);
      });
  });
});
