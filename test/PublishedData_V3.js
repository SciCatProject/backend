"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const sandbox = require("sinon").createSandbox();

let accessTokenArchiveManager = null,
  accessTokenAdminIngestor = null,
  idOrigDatablock = null,
  pid = null,
  pidnonpublic = null,
  attachmentId = null,
  doi = null;

const publishedData = { ...TestData.PublishedData };

const defaultStatus = "pending_registration";

const origDataBlock = { ...TestData.OrigDataBlockCorrect1 };

const testdataset = {
  ...TestData.RawCorrect,
  isPublished: true,
};

const nonpublictestdataset = {
  ...TestData.RawCorrect,
  ownerGroup: "examplenonpublicgroup",
};

describe("1600: PublishedData: Test of access to published data V3", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("PublishedData").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
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

  it("0010: adds a published data", async () => {
    return request(appUrl)
      .post("/api/v3/PublishedData")
      .send(publishedData)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("affiliation")
          .and.equal(publishedData.affiliation);
        res.body.should.have
          .property("creator")
          .and.deep.equal(publishedData.creator);
        res.body.should.have
          .property("publisher")
          .and.equal(publishedData.publisher);
        res.body.should.have
          .property("publicationYear")
          .and.equal(publishedData.publicationYear);
        res.body.should.have.property("title").and.equal(publishedData.title);
        res.body.should.have.property("url").and.equal(publishedData.url);
        res.body.should.have
          .property("abstract")
          .and.equal(publishedData.abstract);
        res.body.should.have
          .property("dataDescription")
          .and.equal(publishedData.dataDescription);
        res.body.should.have
          .property("resourceType")
          .and.equal(publishedData.resourceType);
        res.body.should.have
          .property("numberOfFiles")
          .and.equal(publishedData.numberOfFiles);
        res.body.should.have
          .property("sizeOfArchive")
          .and.equal(publishedData.sizeOfArchive);
        res.body.should.have
          .property("pidArray")
          .and.deep.equal(publishedData.pidArray);
        res.body.should.have
          .property("authors")
          .and.deep.equal(publishedData.authors);
        res.body.should.have
          .property("scicatUser")
          .and.equal(publishedData.scicatUser);
        res.body.should.have
          .property("thumbnail")
          .and.equal(publishedData.thumbnail);
        res.body.should.have
          .property("relatedPublications")
          .and.deep.equal(publishedData.relatedPublications);
        res.body.should.have
          .property("downloadLink")
          .and.equal(publishedData.downloadLink);
        res.body.should.have.property("status").and.equal(publishedData.status);
        doi = encodeURIComponent(res.body["doi"]);
      });
  });

  it("0015: adds a published data without specifying a status should assign the default status", async () => {
    delete publishedData.status;
    return request(appUrl)
      .post("/api/v3/PublishedData")
      .send({ ...publishedData, creator: ["New Creator"] })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("status").and.equal(defaultStatus);
      });
  });

  it("0020: should fetch this new published data without authorization", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0030: should fetch this new published data", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("publisher").and.equal("ESS");
        res.body.should.have
          .property("status")
          .and.equal("pending_registration");
      });
  });

  // NOTE: This is added because we need dataset for registering published data
  it("0040: adds a new raw dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(testdataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        // store link to this dataset in datablocks
        pid = encodeURIComponent(res.body["pid"]);
        publishedData.pidArray.push(res.body["pid"]);
        origDataBlock.datasetId = res.body["pid"];
        origDataBlock.ownerGroup = res.body.ownerGroup;
      });
  });

  it("0050: should register this new published data", async () => {
    return request(appUrl)
      .post("/api/v3/PublishedData/" + doi + "/register")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0060: should fetch this new published data", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPostStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("status").and.equal("registered");
      });
  });

  it("0061: should fetch this new published data without authentication", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("status").and.equal("registered");
      });
  });

  it("0062: should fetch all published data", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.equal(2);
      });
  });

  it("0063: should fetch all published data without authentication", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData")
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.equal(1);
      });
  });

  it("0064: should count all published data", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/count")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.count.should.equal(2);
      });
  });

  it("0065: should count all published data without authentication", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/count")
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.count.should.equal(1);
      });
  });

  it("0066: should fetch published data with filter", async () => {
    const filter = { where: { creator: "New Creator" } };
    await request(appUrl)
      .get(
        `/api/v3/PublishedData?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.equal(1);
        res.body[0].should.have
          .property("creator")
          .and.deep.equal(["New Creator"]);
        res.body[0].should.have.property("thumbnail");
      });
    return request(appUrl)
      .get("/api/v3/PublishedData")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .set({ filter: JSON.stringify(filter) })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.length.should.equal(1);
        res.body[0].should.have.property("creator").and.deep.equal(["New Creator"]);
        res.body[0].should.have.property("thumbnail");
      });
  });

  it("0067: should fetch published data excluding thumbnail using list", async () => {
    const filter = {
      where: { creator: "New Creator" },
      fields: { thumbnail: 0, creator: 1 }
    };
    return request(appUrl)
      .get(`/api/v3/PublishedData?filter=${encodeURIComponent(JSON.stringify(filter))}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body[0].should.have.property("creator");
        res.body[0].should.not.have.property("thumbnail");
      });
  });

  it("0068: should fetch published data including creator only", async () => {
    const filter = { where: { creator: "New Creator" } };
    filter.fields = { creator: 1 };
    await request(appUrl)
      .get(`/api/v3/PublishedData?filter=${encodeURIComponent(JSON.stringify(filter))}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body[0].should.have.property("creator");
        res.body[0].should.not.have.property("thumbnail");
      });
    filter.fields = ["creator"];
    return request(appUrl)
      .get(`/api/v3/PublishedData?filter=${encodeURIComponent(JSON.stringify(filter))}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body[0].should.have.property("creator");
        res.body[0].should.not.have.property("thumbnail");
      });
  });

  // NOTE: This one was commented in the old backend as well
  // it("should resync this new published data", async (done) => {
  //   return request(appUrl)
  //     .post("/api/v3/PublishedData/" + doi + "/resync")
  //     .send(modifiedPublishedData)
  //     .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
  //     .set("Accept", "application/json")
  //     .expect(201)
  //     .expect("Content-Type", /json/)
  //     .then((res, err) => {
  //       if (err) {
  //         return done(err);
  //       }

  //       done();
  //     });
  // });

  it("0070: should fetch this new published data", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0080: adds a new nonpublic dataset", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(nonpublictestdataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("isPublished").and.equal(false);
        res.body.should.have.property("pid").and.be.string;
        res.body.should.have.property("datasetName").and.be.string;
        pidnonpublic = encodeURIComponent(res.body["pid"]);
      });
  });

  it("0090: should delete this published data", async () => {
    return request(appUrl)
      .delete("/api/v3/PublishedData/" + doi)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0100: should fetch this new dataset", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + pid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("isPublished").and.equal(true);
      });
  });

  it("0110: should fetch the non public dataset as ingestor", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + pidnonpublic)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("isPublished").and.equal(false);
      });
  });

  it("0120: adds a new origDatablock", async () => {
    return request(appUrl)
      .post("/api/v3/OrigDatablocks")
      .send(origDataBlock)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("size").and.equal(41780189);
        res.body.should.have.property("id").and.be.string;
        idOrigDatablock = res.body["id"];
      });
  });

  it("0130: should add a new attachment to this dataset", async () => {
    const testAttachment = {
      thumbnail: "data/abc123",
      caption: "Some caption",
      datasetId: decodeURIComponent(pid),
      ownerGroup: testdataset.ownerGroup,
      accessGroups: ["loki", "odin"],
    };
    return request(appUrl)
      .post("/api/v3/Datasets/" + pid + "/attachments")
      .send(testAttachment)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have
          .property("thumbnail")
          .and.equal(testAttachment.thumbnail);
        res.body.should.have
          .property("caption")
          .and.equal(testAttachment.caption);
        res.body.should.have
          .property("ownerGroup")
          .and.equal(testAttachment.ownerGroup);
        res.body.should.have.property("accessGroups");
        res.body.should.have.property("createdBy");
        res.body.should.have.property("updatedBy").and.be.string;
        res.body.should.have.property("createdAt");
        res.body.should.have.property("id").and.be.string;
        res.body.should.have
          .property("datasetId")
          .and.equal(testAttachment.datasetId);
        attachmentId = res.body["id"];
      });
  });

  // NOTE: Getting dataset attachment by id is missing but we modify the test little bit and check if created attachment is part of the array of attachments returned by /datasets/{id}/attachments
  it("0140: should fetch this dataset attachment", async () => {
    return request(appUrl)
      .get("/api/v3/Datasets/" + pid + "/attachments")
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.length(1);
        res.body[0].should.have.property("id").and.equal(attachmentId);
      });
  });

  it("0150: should fetch some published datasets anonymously", async () => {
    var fields = {
      ownerGroup: ["p13388"],
    };
    var limits = {
      skip: 0,
      limit: 2,
    };
    return request(appUrl)
      .get(
        "/api/v3/Datasets/fullquery" +
        "?fields=" +
        encodeURIComponent(JSON.stringify(fields)) +
        "&limits=" +
        encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body[0].should.have.property("isPublished").and.equal(true);
      });
  });

  it("0160: should fail to fetch non-public dataset anonymously", async () => {
    var fields = {
      ownerGroup: [nonpublictestdataset.ownerGroup],
    };
    var limits = {
      skip: 0,
      limit: 2,
    };
    return request(appUrl)
      .get(
        "/api/v3/Datasets/fullquery" +
        "?fields=" +
        encodeURIComponent(JSON.stringify(fields)) +
        "&limits=" +
        encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.instanceof(Array).and.to.have.length(0);
      });
  });

  it("0170: should fetch one dataset including related data anonymously", async () => {
    var limits = {
      skip: 0,
      limit: 2,
    };
    var filter = {
      where: {
        ownerGroup: "p13388",
      },
      include: [
        {
          relation: "origdatablocks",
        },
        {
          relation: "datablocks",
        },
        {
          relation: "attachments",
        },
      ],
    };

    return request(appUrl)
      .get(
        "/api/v3/Datasets/findOne" +
        "?filter=" +
        encodeURIComponent(JSON.stringify(filter)) +
        "&limits=" +
        encodeURIComponent(JSON.stringify(limits)),
      )
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.origdatablocks[0].should.have
          .property("ownerGroup")
          .and.equal("p13388");
      });
  });

  it("0180: should delete this dataset attachment", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + pid + "/attachments/" + attachmentId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulDeleteStatusCode);
  });

  it("0190: should delete a OrigDatablock", async () => {
    return request(appUrl)
      .delete("/api/v3/OrigDatablocks/" + idOrigDatablock)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("id").and.equal(idOrigDatablock);
      });
  });

  it("0200: should delete the nonpublic dataset", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + pidnonpublic)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0210: should delete this dataset", async () => {
    return request(appUrl)
      .delete("/api/v3/Datasets/" + pid)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0220: should return 404", async () => {
    return request(appUrl)
      .get("/api/v3/PublishedData/non-existing-id")
      .set("Accept", "application/json")
      .expect(TestData.NotFoundStatusCode)
      .expect("Content-Type", /json/);
  });
});
