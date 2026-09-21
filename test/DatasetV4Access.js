"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");

let user1Token = null,
  user2Token = null,
  user3Token = null,
  accessTokenArchiveManager = null,
  accessTokenAdminIngestor = null,
  derivedDatasetMinPid = null,
  proposalId = null,
  instrumentId = null,
  sampleId = null,
  origDatablockId1 = null,
  origDatablockData1 = {
    ...TestData.OrigDataBlockCorrect1,
    datasetId: null,
  },
  attachmentId = null,
  datasetId2 = null;

describe("2700: Datasets v4 access tests", () => {
  before(async () => {
    db.collection("Dataset").deleteMany({});
    db.collection("Proposal").deleteMany({});
    db.collection("Instrument").deleteMany({});
    db.collection("Sample").deleteMany({});
    db.collection("Attachment").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });
    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
    user1Token = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
    user2Token = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts["user2"]["password"],
    });
    user3Token = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"]["password"],
    });

    await request(appUrl)
      .post("/api/v3/Proposals")
      .send({
        ...TestData.ProposalCorrectMin,
        ownerGroup: TestData.Accounts.user1.role,
        accessGroups: [TestData.Accounts.user3.role],
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        proposalId = res.body.proposalId;
      });

    await request(appUrl)
      .post("/api/v3/Instruments")
      .send(TestData.InstrumentCorrect1)
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        instrumentId = res.body.pid;
      });

    await request(appUrl)
      .post("/api/v3/Samples")
      .send({
        ...TestData.SampleCorrect,
        ownerGroup: TestData.Accounts.user1.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        sampleId = res.body.sampleId;
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...TestData.DerivedCorrectV4,
        ownerGroup: TestData.Accounts.user1.role,
        accessGroups: [TestData.Accounts.user3.role],
        proposalIds: [proposalId],
        instrumentIds: [instrumentId],
        sampleIds: [sampleId],
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        derivedDatasetMinPid = res.body.pid;
        origDatablockData1.datasetId = derivedDatasetMinPid;
      });

    origDatablockData1.datasetId = derivedDatasetMinPid;

    await request(appUrl)
      .post(`/api/v3/origDatablocks`)
      .send(origDatablockData1)
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        origDatablockId1 = res.body.id;
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...TestData.RawCorrectV4,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        datasetId2 = res.body.pid;
      });

    await request(appUrl)
      .post("/api/v4/origdatablocks")
      .send({
        ...TestData.OrigDatablockV4MinCorrect,
        datasetId: datasetId2,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);

    await request(appUrl)
      .post("/api/v3/datablocks")
      .send({
        ...TestData.DataBlockCorrect,
        datasetId: datasetId2,
        ownerGroup: TestData.Accounts.user1.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({ ...TestData.CustomDatasetCorrect })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);

    const attachment = {
      ...TestData.AttachmentCorrectV4,
      relationships: [
        {
          targetId: derivedDatasetMinPid,
          targetType: "dataset",
        },
        {
          targetId: sampleId,
          targetType: "sample",
        },
      ],
      aid: uuidv4(),
    };

    await request(appUrl)
      .post("/api/v4/attachments")
      .send(attachment)
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        attachmentId = res.body.aid;
      });
  });

  async function deleteDataset(item) {
    const response = await request(appUrl)
      .delete("/api/v4/datasets/" + encodeURIComponent(item.pid))
      .auth(accessTokenArchiveManager, { type: "bearer" })
      .expect(TestData.SuccessfulDeleteStatusCode);

    return response;
  }

  async function processArray(array) {
    for (const item of array) {
      await deleteDataset(item);
    }
  }

  after(() => {
    db.collection("Datablock").deleteMany({});
    db.collection("OrigDatablock").deleteMany({});
  });

  describe("Fetching v4 all datasets access", () => {
    it("0100: should fetch dataset relation fields with correct data included if provided in the filter and have the correct rights", async () => {
      const filter = {
        include: [
          "instruments",
          "proposals",
          "samples",
          "origdatablocks",
          "datablocks",
        ],
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(user1Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          const [firstDataset] = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.instruments.should.be.a("array");
          firstDataset.instruments.should.have.length(1);
          const [instrument] = firstDataset.instruments;
          instrument.should.have.property("pid");
          instrument.pid.should.be.eq(instrumentId);

          firstDataset.should.have.property("proposals");
          firstDataset.proposals.should.be.a("array");
          firstDataset.proposals.should.have.length(1);
          const [proposal] = firstDataset.proposals;
          proposal.should.have.property("proposalId");
          proposal.proposalId.should.be.eq(proposalId);

          firstDataset.should.have.property("samples");
          firstDataset.samples.should.be.a("array");
          firstDataset.samples.should.have.length(1);
          const [sample] = firstDataset.samples;
          sample.should.have.property("sampleId");
          sample.sampleId.should.be.eq(sampleId);

          firstDataset.should.have.property("origdatablocks");
          firstDataset.origdatablocks.should.be.a("array");
          firstDataset.origdatablocks.should.have.length(1);
          const [origdatablock] = firstDataset.origdatablocks;
          origdatablock.should.have.property("_id");
          origdatablock._id.should.be.eq(origDatablockId1);
        });
    });

    it("0101: should not be able to fetch dataset if do not have the correct access rights", async () => {
      const filter = {};

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(user2Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .then((res) => {
          res.body.should.be.a("array");
          res.body.should.have.length(0);
        });
    });

    it("0102: should fetch dataset relation fields with correct data included if provided in the filter and have the correct rights", async () => {
      const filter = {
        include: [
          "instruments",
          "proposals",
          "samples",
          "origdatablocks",
          "datablocks",
          "attachments",
        ],
      };

      return request(appUrl)
        .get(`/api/v4/datasets`)
        .query({ filter: JSON.stringify(filter) })
        .auth(user3Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("array");
          const [firstDataset] = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.instruments.should.be.a("array");
          firstDataset.instruments.should.have.length(1);
          const [instrument] = firstDataset.instruments;
          instrument.should.have.property("pid");
          instrument.pid.should.be.eq(instrumentId);

          firstDataset.should.have.property("proposals");
          firstDataset.proposals.should.be.a("array");
          firstDataset.proposals.should.have.length(1);
          const [proposal] = firstDataset.proposals;
          proposal.should.have.property("proposalId");
          proposal.proposalId.should.be.eq(proposalId);

          firstDataset.should.have.property("samples");
          firstDataset.samples.should.be.a("array");
          firstDataset.samples.should.have.length(0);

          firstDataset.should.have.property("origdatablocks");
          firstDataset.origdatablocks.should.be.a("array");
          firstDataset.origdatablocks.should.have.length(1);
          const [origdatablock] = firstDataset.origdatablocks;
          origdatablock.should.have.property("_id");
          origdatablock._id.should.be.eq(origDatablockId1);

          firstDataset.should.have.property("attachments");
          firstDataset.attachments.should.be.a("array");
          firstDataset.attachments.should.have.length(1);
          const [attachments] = firstDataset.attachments;
          attachments.should.have.property("aid");
          attachments.aid.should.be.eq(attachmentId);
        });
    });
  });

  describe("Datasets v4 findOne access tests", () => {
    it("0200: should fetch dataset relation fields with correct data included if provided in the filter and have the correct rights", async () => {
      const filter = {
        include: [
          "instruments",
          "proposals",
          "samples",
          "origdatablocks",
          "datablocks",
        ],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(user1Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          const firstDataset = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.instruments.should.be.a("array");
          firstDataset.instruments.should.have.length(1);
          const [instrument] = firstDataset.instruments;
          instrument.should.have.property("pid");
          instrument.pid.should.be.eq(instrumentId);

          firstDataset.should.have.property("proposals");
          firstDataset.proposals.should.be.a("array");
          firstDataset.proposals.should.have.length(1);
          const [proposal] = firstDataset.proposals;
          proposal.should.have.property("proposalId");
          proposal.proposalId.should.be.eq(proposalId);

          firstDataset.should.have.property("samples");
          firstDataset.samples.should.be.a("array");
          firstDataset.samples.should.have.length(1);
          const [sample] = firstDataset.samples;
          sample.should.have.property("sampleId");
          sample.sampleId.should.be.eq(sampleId);

          firstDataset.should.have.property("origdatablocks");
          firstDataset.origdatablocks.should.be.a("array");
          firstDataset.origdatablocks.should.have.length(1);
          const [origdatablock] = firstDataset.origdatablocks;
          origdatablock.should.have.property("_id");
          origdatablock._id.should.be.eq(origDatablockId1);
        });
    });

    it("0201: should not be able to fetch dataset if do not have the correct access rights", async () => {
      const filter = {};

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(user2Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .then((res) => {
          res.body.should.be.a("object").and.to.be.deep.equal({});
        });
    });

    it("0202: should fetch dataset relation fields with correct data included if provided in the filter and have the correct rights", async () => {
      const filter = {
        include: [
          "instruments",
          "proposals",
          "samples",
          "origdatablocks",
          "datablocks",
        ],
      };

      return request(appUrl)
        .get(`/api/v4/datasets/findOne`)
        .query({ filter: JSON.stringify(filter) })
        .auth(user3Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          const firstDataset = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.instruments.should.be.a("array");
          firstDataset.instruments.should.have.length(1);
          const [instrument] = firstDataset.instruments;
          instrument.should.have.property("pid");
          instrument.pid.should.be.eq(instrumentId);

          firstDataset.should.have.property("proposals");
          firstDataset.proposals.should.be.a("array");
          firstDataset.proposals.should.have.length(1);
          const [proposal] = firstDataset.proposals;
          proposal.should.have.property("proposalId");
          proposal.proposalId.should.be.eq(proposalId);

          firstDataset.should.have.property("samples");
          firstDataset.samples.should.be.a("array");
          firstDataset.samples.should.have.length(0);

          firstDataset.should.have.property("origdatablocks");
          firstDataset.origdatablocks.should.be.a("array");
          firstDataset.origdatablocks.should.have.length(1);
          const [origdatablock] = firstDataset.origdatablocks;
          origdatablock.should.have.property("_id");
          origdatablock._id.should.be.eq(origDatablockId1);
        });
    });
  });

  describe("Datasets v4 findById access tests", () => {
    it("0300: should fetch dataset relation fields with correct data included if provided in the filter and have the correct rights", () => {
      return request(appUrl)
        .get(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}?include=instruments&include=proposals&include=samples&include=origdatablocks&include=datablocks`,
        )
        .auth(user1Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          const firstDataset = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.instruments.should.be.a("array");
          firstDataset.instruments.should.have.length(1);
          const [instrument] = firstDataset.instruments;
          instrument.should.have.property("pid");
          instrument.pid.should.be.eq(instrumentId);

          firstDataset.should.have.property("proposals");
          firstDataset.proposals.should.be.a("array");
          firstDataset.proposals.should.have.length(1);
          const [proposal] = firstDataset.proposals;
          proposal.should.have.property("proposalId");
          proposal.proposalId.should.be.eq(proposalId);

          firstDataset.should.have.property("samples");
          firstDataset.samples.should.be.a("array");
          firstDataset.samples.should.have.length(1);
          const [sample] = firstDataset.samples;
          sample.should.have.property("sampleId");
          sample.sampleId.should.be.eq(sampleId);

          firstDataset.should.have.property("origdatablocks");
          firstDataset.origdatablocks.should.be.a("array");
          firstDataset.origdatablocks.should.have.length(1);
          const [origdatablock] = firstDataset.origdatablocks;
          origdatablock.should.have.property("_id");
          origdatablock._id.should.be.eq(origDatablockId1);
        });
    });

    it("0301: should not be able to fetch dataset if do not have the correct access rights", () => {
      return request(appUrl)
        .get(
          `/api/v4/datasets/public/${encodeURIComponent(derivedDatasetMinPid)}`,
        )
        .auth(user2Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .then((res) => {
          res.body.should.be.a("object").and.to.be.deep.equal({});
        });
    });

    it("0302: should fetch dataset relation fields with correct data included if provided in the filter and have the correct rights", () => {
      return request(appUrl)
        .get(
          `/api/v4/datasets/${encodeURIComponent(derivedDatasetMinPid)}?include=instruments&include=proposals&include=samples&include=origdatablocks&include=datablocks`,
        )
        .auth(user3Token, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          const firstDataset = res.body;

          firstDataset.should.have.property("pid");
          firstDataset.should.have.property("instruments");
          firstDataset.instruments.should.be.a("array");
          firstDataset.instruments.should.have.length(1);
          const [instrument] = firstDataset.instruments;
          instrument.should.have.property("pid");
          instrument.pid.should.be.eq(instrumentId);

          firstDataset.should.have.property("proposals");
          firstDataset.proposals.should.be.a("array");
          firstDataset.proposals.should.have.length(1);
          const [proposal] = firstDataset.proposals;
          proposal.should.have.property("proposalId");
          proposal.proposalId.should.be.eq(proposalId);

          firstDataset.should.have.property("samples");
          firstDataset.samples.should.be.a("array");
          firstDataset.samples.should.have.length(0);

          firstDataset.should.have.property("origdatablocks");
          firstDataset.origdatablocks.should.be.a("array");
          firstDataset.origdatablocks.should.have.length(1);
          const [origdatablock] = firstDataset.origdatablocks;
          origdatablock.should.have.property("_id");
          origdatablock._id.should.be.eq(origDatablockId1);
        });
    });
  });

  describe("Cleanup datasets after the tests", () => {
    it("0400: delete all dataset as archivemanager", async () => {
      return await request(appUrl)
        .get("/api/v4/datasets")
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          return processArray(res.body);
        });
    });
  });
});
