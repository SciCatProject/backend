"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");
const assert = require("node:assert");

let accessTokenAdminIngestor = null,
  accessTokenProposalAdmin = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  proposalId1 = null,
  proposalId2 = null,
  proposalId3 = null;

const ProposalCorrectMinV4 = {
  proposalId: "20170266-v4",
  email: "proposer@uni.edu",
  title: "A minimal test proposal v4",
  ownerGroup: "proposalingestor",
  accessGroups: [],
};

const ProposalCorrectCompleteV4 = {
  proposalId: "20170267-v4",
  email: "proposer@uni.edu",
  firstname: "Test",
  lastname: "User",
  pi_email: "pi@uni.edu",
  pi_firstname: "Principal",
  pi_lastname: "Investigator",
  title: "A complete test proposal v4",
  abstract: "Abstract of test proposal v4",
  ownerGroup: "proposalingestor",
  accessGroups: ["proposalgroup1"],
  type: "Default Proposal",
  keywords: ["keyword1", "keyword2"],
  instrumentIds: ["instrument1", "instrument2"],
  isPublished: false,
  MeasurementPeriodList: [
    {
      instrument: "ESS3-1",
      start: "2017-07-24T13:56:30.000Z",
      end: "2017-07-25T13:56:30.000Z",
      comment: "Some comment",
    },
  ],
  metadata: { customField: "customValue" },
};

const ProposalCorrectPublishedV4 = {
  proposalId: "20170268-v4",
  email: "proposer@uni.edu",
  title: "A published test proposal v4",
  ownerGroup: "proposalingestor",
  accessGroups: [],
  isPublished: true,
};

describe("3000: Proposals v4 tests", () => {
  before(async () => {
    db.collection("Proposal").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenProposalAdmin = await utils.getToken(appUrl, {
      username: "proposaladmin",
      password: TestData.Accounts["proposaladmin"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });

    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts["user2"]["password"],
    });
  });

  after(async () => {
    // Clean up created proposals
    if (proposalId1) {
      await request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);
    }
    if (proposalId2) {
      await request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalId2))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);
    }
    if (proposalId3) {
      await request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalId3))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);
    }
    db.collection("Proposal").deleteMany({ proposalId: /-v4$/ });
  });

  async function deleteProposal(proposalId, token) {
    return request(appUrl)
      .delete("/api/v4/proposals/" + encodeURIComponent(proposalId))
      .auth(token, { type: "bearer" })
      .expect(TestData.SuccessfulDeleteStatusCode);
  }

  describe("Proposals v4 validation tests", () => {
    it("3000:0100: should not be able to validate proposal if not logged in", async () => {
      return request(appUrl)
        .post("/api/v4/proposals/isValid")
        .send(ProposalCorrectMinV4)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("3000:0101: check if minimal proposal is valid", async () => {
      return request(appUrl)
        .post("/api/v4/proposals/isValid")
        .send(ProposalCorrectMinV4)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("3000:0102: check if complete proposal is valid", async () => {
      return request(appUrl)
        .post("/api/v4/proposals/isValid")
        .send(ProposalCorrectCompleteV4)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });
  });

  describe("Proposals v4 create tests", () => {
    it("3000:0200: should not be able to create proposal if not logged in", async () => {
      return request(appUrl)
        .post("/api/v4/proposals")
        .send(ProposalCorrectMinV4)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("3000:0201: should create minimal proposal", async () => {
      const uniqueProposalId = `${ProposalCorrectMinV4.proposalId}-${uuidv4()}`;
      const proposalToCreate = { ...ProposalCorrectMinV4, proposalId: uniqueProposalId };

      return request(appUrl)
        .post("/api/v4/proposals")
        .send(proposalToCreate)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(uniqueProposalId);
          res.body.should.have.property("title").and.equal(proposalToCreate.title);
          res.body.should.have.property("email").and.equal(proposalToCreate.email);
          res.body.should.have.property("createdBy");
          res.body.should.have.property("updatedBy");
          res.body.should.have.property("createdAt");
          res.body.should.have.property("updatedAt");
          proposalId1 = res.body.proposalId;
        });
    });

    it("3000:0202: should not create proposal with duplicate proposalId", async () => {
      return request(appUrl)
        .post("/api/v4/proposals")
        .send(ProposalCorrectMinV4)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.ConflictStatusCode);
    });

    it("3000:0203: should create complete proposal", async () => {
      const uniqueProposalId = `${ProposalCorrectCompleteV4.proposalId}-${uuidv4()}`;
      const proposalToCreate = { ...ProposalCorrectCompleteV4, proposalId: uniqueProposalId };

      return request(appUrl)
        .post("/api/v4/proposals")
        .send(proposalToCreate)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(uniqueProposalId);
          res.body.should.have.property("title").and.equal(proposalToCreate.title);
          res.body.should.have.property("abstract").and.equal(proposalToCreate.abstract);
          res.body.should.have.property("pi_email").and.equal(proposalToCreate.pi_email);
          res.body.should.have.property("keywords").and.deep.equal(proposalToCreate.keywords);
          res.body.should.have.property("MeasurementPeriodList").and.have.lengthOf(1);
          proposalId2 = res.body.proposalId;
        });
    });
  });

  describe("Proposals v4 findAll tests", () => {
    it("3000:0300: should not be able to list proposals if not logged in", async () => {
      return request(appUrl)
        .get("/api/v4/proposals")
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0301: should list all proposals for proposaladmin", async () => {
      return request(appUrl)
        .get("/api/v4/proposals")
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("3000:0302: should list proposals with filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals")
        .query({
          filter: JSON.stringify({
            where: { proposalId: proposalId1 },
          }),
        })
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.should.have.lengthOf(1);
          res.body[0].should.have.property("proposalId").and.equal(proposalId1);
        });
    });

    it("3000:0303: should list proposals with pagination", async () => {
      return request(appUrl)
        .get("/api/v4/proposals")
        .query({
          filter: JSON.stringify({
            where: {},
            limits: { limit: 1, skip: 0 },
          }),
        })
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.should.have.lengthOf.at.most(1);
        });
    });
  });

  describe("Proposals v4 findOne tests", () => {
    it("3000:0400: should not be able to findOne proposal if not logged in", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/findOne")
        .query({
          filter: JSON.stringify({
            where: { proposalId: proposalId1 },
          }),
        })
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0401: should find first proposal matching filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/findOne")
        .query({
          filter: JSON.stringify({
            where: { proposalId: proposalId1 },
          }),
        })
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
        });
    });

    it("3000:0402: should find first proposal with include", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/findOne")
        .query({
          filter: JSON.stringify({
            where: { proposalId: proposalId2 },
            include: ["samples"],
          }),
        })
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId2);
        });
    });
  });

  describe("Proposals v4 count tests", () => {
    it("3000:0500: should not be able to count proposals if not logged in", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/count")
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0501: should count all proposals", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/count")
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("count");
          res.body.count.should.be.a("number");
        });
    });

    it("3000:0502: should count proposals with filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/count")
        .query({
          filter: JSON.stringify({
            where: { ownerGroup: "proposalingestor" },
          }),
        })
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("count");
          res.body.count.should.be.at.least(1);
        });
    });
  });

  describe("Proposals v4 fullfacet tests", () => {
    it("3000:0600: should not be able to get fullfacet if not logged in", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/fullfacet")
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0601: should get fullfacet for proposals", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/fullfacet")
        .query({
          filters: JSON.stringify({
            facets: ["ownerGroup", "type"],
            fields: {},
          }),
        })
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });
  });

  describe("Proposals v4 findById tests", () => {
    it("3000:0700: should not be able to get proposal by id if not logged in", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0701: should get proposal by proposalId", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
        });
    });

    it("3000:0702: should get proposal with include", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(proposalId2) + "?include=samples")
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId2);
        });
    });

    it("3000:0703: should not find non-existent proposal", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/nonexistent-proposal")
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode);
    });
  });

  describe("Proposals v4 update tests", () => {
    it("3000:0800: should not be able to update proposal if not logged in", async () => {
      return request(appUrl)
        .patch("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send({ title: "Updated title" })
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0801: should partially update proposal", async () => {
      return request(appUrl)
        .patch("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send({ title: "Updated title v4" })
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
          res.body.should.have.property("title").and.equal("Updated title v4");
        });
    });

    it("3000:0802: should replace proposal with PUT", async () => {
      const updatedProposal = {
        ...ProposalCorrectMinV4,
        proposalId: proposalId1,
        title: "Replaced title v4",
      };

      return request(appUrl)
        .put("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send(updatedProposal)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulPostStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
          res.body.should.have.property("title").and.equal("Replaced title v4");
        });
    });
  });

  describe("Proposals v4 delete tests", () => {
    it("3000:0900: should not be able to delete proposal if not logged in", async () => {
      const uniqueProposalId = `20170269-v4-${uuidv4()}`;
      const proposalToCreate = { ...ProposalCorrectMinV4, proposalId: uniqueProposalId };

      // First create a proposal
      await request(appUrl)
        .post("/api/v4/proposals")
        .send(proposalToCreate)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);

      // Then try to delete without auth
      return request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(uniqueProposalId))
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0901: should delete proposal", async () => {
      const uniqueProposalId = `20170270-v4-${uuidv4()}`;
      const proposalToCreate = { ...ProposalCorrectMinV4, proposalId: uniqueProposalId };

      // First create a proposal
      await request(appUrl)
        .post("/api/v4/proposals")
        .send(proposalToCreate)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);

      // Then delete it
      return request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(uniqueProposalId))
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(uniqueProposalId);
        });
    });

    it("3000:0902: should not find deleted proposal", async () => {
      const uniqueProposalId = `20170271-v4-${uuidv4()}`;
      const proposalToCreate = { ...ProposalCorrectMinV4, proposalId: uniqueProposalId };

      // First create a proposal
      await request(appUrl)
        .post("/api/v4/proposals")
        .send(proposalToCreate)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);

      // Then delete it
      await request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(uniqueProposalId))
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);

      // Try to get it - should not be found
      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(uniqueProposalId))
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode);
    });
  });

  describe("Proposals v4 create published proposal for public tests", () => {
    it("3000:1000: should create published proposal for public endpoint tests", async () => {
      const uniqueProposalId = `${ProposalCorrectPublishedV4.proposalId}-${uuidv4()}`;
      const proposalToCreate = { ...ProposalCorrectPublishedV4, proposalId: uniqueProposalId };

      return request(appUrl)
        .post("/api/v4/proposals")
        .send(proposalToCreate)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(uniqueProposalId);
          res.body.should.have.property("isPublished").and.equal(true);
          proposalId3 = res.body.proposalId;
        });
    });
  });
});
