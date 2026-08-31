"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");
const assert = require("node:assert");

let accessTokenProposalAdmin = null,
  proposalIdPublished1 = null,
  proposalIdPublished2 = null;

const ProposalCorrectPublishedV4_1 = {
  proposalId: "public-proposal-1-v4",
  email: "public-proposer@uni.edu",
  title: "First public test proposal v4",
  ownerGroup: "proposalingestor",
  accessGroups: [],
  isPublished: true,
};

const ProposalCorrectPublishedV4_2 = {
  proposalId: "public-proposal-2-v4",
  email: "public-proposer2@uni.edu",
  title: "Second public test proposal v4",
  abstract: "This is a public proposal",
  ownerGroup: "proposalingestor",
  accessGroups: [],
  type: "Default Proposal",
  keywords: ["public", "test"],
  isPublished: true,
};

describe("3100: Proposals v4 public tests", () => {
  before(async () => {
    db.collection("Proposal").deleteMany({ proposalId: /^public-proposal-/ });

    accessTokenProposalAdmin = await utils.getToken(appUrl, {
      username: "proposaladmin",
      password: TestData.Accounts["proposaladmin"]["password"],
    });

    // Create some published proposals for testing
    const uniqueId1 = `${ProposalCorrectPublishedV4_1.proposalId}-${uuidv4()}`;
    const proposalToCreate1 = { ...ProposalCorrectPublishedV4_1, proposalId: uniqueId1 };
    const response1 = await request(appUrl)
      .post("/api/v4/proposals")
      .send(proposalToCreate1)
      .auth(accessTokenProposalAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);
    proposalIdPublished1 = response1.body.proposalId;

    const uniqueId2 = `${ProposalCorrectPublishedV4_2.proposalId}-${uuidv4()}`;
    const proposalToCreate2 = { ...ProposalCorrectPublishedV4_2, proposalId: uniqueId2 };
    const response2 = await request(appUrl)
      .post("/api/v4/proposals")
      .send(proposalToCreate2)
      .auth(accessTokenProposalAdmin, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);
    proposalIdPublished2 = response2.body.proposalId;
  });

  after(async () => {
    // Clean up
    if (proposalIdPublished1) {
      await request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalIdPublished1))
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);
    }
    if (proposalIdPublished2) {
      await request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalIdPublished2))
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);
    }
    db.collection("Proposal").deleteMany({ proposalId: /^public-proposal-/ });
  });

  describe("Proposals v4 public findAll tests", () => {
    it("0100: should list public proposals without auth", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("0101: should list public proposals with filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: { proposalId: proposalIdPublished1 },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.should.have.lengthOf(1);
          res.body[0].should.have.property("proposalId").and.equal(proposalIdPublished1);
        });
    });

    it("0102: should list public proposals with pagination", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: {},
            limits: { limit: 1, skip: 0 },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.should.have.lengthOf.at.most(1);
        });
    });
  });

  describe("Proposals v4 public count tests", () => {
    it("0200: should count public proposals without auth", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/count")
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("count");
          res.body.count.should.be.a("number");
          res.body.count.should.be.at.least(2);
        });
    });

    it("0201: should count public proposals with filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/count")
        .query({
          filter: JSON.stringify({
            where: { ownerGroup: "proposalingestor" },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("count");
          res.body.count.should.be.at.least(2);
        });
    });
  });

  describe("Proposals v4 public fullfacet tests", () => {
    it("0300: should get fullfacet for public proposals without auth", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/fullfacet")
        .query({
          filters: JSON.stringify({
            facets: ["ownerGroup", "type", "keywords"],
            fields: {},
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("0301: should get fullfacet with fields filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/fullfacet")
        .query({
          filters: JSON.stringify({
            facets: ["keywords"],
            fields: { isPublished: true },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });
  });

  describe("Proposals v4 public findOne tests", () => {
    it("0400: should find first public proposal matching filter without auth", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/findOne")
        .query({
          filter: JSON.stringify({
            where: { proposalId: proposalIdPublished1 },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalIdPublished1);
        });
    });

    it("0401: should find first public proposal with include without auth", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/findOne")
        .query({
          filter: JSON.stringify({
            where: { proposalId: proposalIdPublished2 },
            include: ["samples"],
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalIdPublished2);
        });
    });
  });

  describe("Proposals v4 public findById tests", () => {
    it("0500: should get public proposal by proposalId without auth", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/" + encodeURIComponent(proposalIdPublished1))
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalIdPublished1);
          res.body.should.have.property("isPublished").and.equal(true);
        });
    });

    it("0501: should get public proposal with include without auth", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/" + encodeURIComponent(proposalIdPublished2) + "?include=samples")
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalIdPublished2);
          res.body.should.have.property("isPublished").and.equal(true);
        });
    });

    it("0502: should not find unpublished proposal via public endpoint", async () => {
      // First create an unpublished proposal
      const unpublishedProposal = {
        proposalId: `unpublished-proposal-v4-${uuidv4()}`,
        email: "private-proposer@uni.edu",
        title: "Unpublished test proposal",
        ownerGroup: "proposalingestor",
        accessGroups: [],
        isPublished: false,
      };

      await request(appUrl)
        .post("/api/v4/proposals")
        .send(unpublishedProposal)
        .auth(accessTokenProposalAdmin, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);

      // Try to get it via public endpoint - should not be found
      return request(appUrl)
        .get("/api/v4/proposals/public/" + encodeURIComponent(unpublishedProposal.proposalId))
        .expect(TestData.NotFoundStatusCode);
    });

    it("0503: should not find non-existent public proposal", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/nonexistent-public-proposal")
        .expect(TestData.NotFoundStatusCode);
    });
  });

  describe("Proposals v4 public edge cases", () => {
    it("0600: should handle filter with text search", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: { title: { $regex: "public", $options: "i" } },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.every(p => p.title && p.title.toLowerCase().includes("public")).should.be.true;
        });
    });

    it("0601: should handle filter with type", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: { type: "Default Proposal" },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("0602: should handle filter with keywords", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: { keywords: { $in: ["public"] } },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });
  });
});
