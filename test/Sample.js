"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,

  sampleId = null,
  attachmentId = null,
  datasetId = null;

describe("2200: Sample: Simple Sample", () => {
  before(async () => {
    db.collection("Sample").deleteMany({});
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

  it("0010: adds a new sample", async () => {
    return request(appUrl)
      .post("/api/v3/Samples")
      .send(TestData.SampleCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
        sampleId = res.body["sampleId"];
      });
  });

  it("0020: should fetch this new sample", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("sampleId").and.be.string;
      });
  });

  it("0021: should fetch sample count", async () => {
    return request(appUrl)
      .get("/api/v3/samples/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("count").and.be.numeric;
        res.body["count"].should.be.greaterThan(0);
      });
  });

  it("0025: should fetch this new sample by characteristics filter", async () => {
    const fields = {
      characteristics: [
        { lhs: "chemical_formula", relation: "EQUAL_TO_STRING", rhs: "H2O" },
      ],
    };
    return request(appUrl)
      .get(
        `/api/v3/Samples/fullquery?fields=${encodeURIComponent(JSON.stringify(fields))}&limits={}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.be.equal(1);
        res.body[0].should.have.property("sampleId").and.equal(sampleId);
      });
  });

  function defineAttachment(caption) {
    return {
      thumbnail: TestData.AttachmentCorrect.thumbnail,
      caption: caption || TestData.AttachmentCorrect.caption,
    };
  }

  it("0030: should add a new attachment to this sample", async () => {
    const attachment = defineAttachment("0030: New attachment for this sample");

    return request(appUrl)
      .post("/api/v3/Samples/" + sampleId + "/attachments")
      .send(attachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(attachment.thumbnail);
        res.body.should.have.property("caption").and.equal(attachment.caption);
        res.body.should.have
          .property("ownerGroup")
          .and.equal(TestData.SampleCorrect.ownerGroup);
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("id").and.be.string;
        res.body.should.have.property("sampleId").and.equal(sampleId);
        attachmentId = res.body["id"];
      });
  });

  it("0040: should fetch all attachments of this sample", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId + "/attachments/")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array);
      });
  });

  // NOTE: Not sure if this one is still needed because this endpoint is not present in the swagger documentation. We are not able to fetch specific attachment under samples.
  it("0050: should fetch this sample attachment", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId + "/attachments/" + attachmentId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0060: should delete this sample attachment", async () => {
    return request(appUrl)
      .delete("/api/v3/Samples/" + sampleId + "/attachments/" + attachmentId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0070: should return no datasets", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId + "/datasets")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array);
        res.body.length.should.be.equal(0);
      });
  });

  it("0080: insert dataset using this sample", async () => {
    let dataset = { ...TestData.RawCorrect };
    dataset.sampleId = sampleId;
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(dataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("owner").and.be.string;
        res.body.should.have.property("type").and.equal("raw");
        res.body.should.have.property("pid").and.be.string;
        datasetId = encodeURIComponent(res.body["pid"]);
      });
  });

  it("0090: should retrieve dataset for sample", async () => {
    return request(appUrl)
      .get("/api/v3/Samples/" + sampleId + "/datasets")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array);
        res.body.length.should.be.equal(1);
        res.body[0].pid.should.be.equal(decodeURIComponent(datasetId));
      });
  });

  it("0100: should delete the dataset linked to sample", function (done) {
    request(appUrl)
      .delete("/api/v3/Datasets/" + datasetId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .end((err) => {
        if (err) return done(err);
        done();
      });
  });

  it("0110: should delete this sample", async () => {
    return request(appUrl)
      .delete("/api/v3/Samples/" + sampleId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });
});
