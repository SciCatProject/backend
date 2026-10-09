"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");
const assert = require("node:assert");

let accessTokenProposalIngestor = null,
  accessTokenArchiveManager = null,
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
    await db.collection("Proposal").deleteMany({ proposalId: /^public-proposal-/ });

    accessTokenProposalIngestor = await utils.getToken(appUrl, {
      username: "proposalIngestor",
      password: TestData.Accounts["proposalIngestor"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });

    // Create some published proposals for testing
    const uniqueId1 = `${ProposalCorrectPublishedV4_1.proposalId}-${uuidv4()}`;
    const proposalToCreate1 = {
      ...ProposalCorrectPublishedV4_1,
      proposalId: uniqueId1,
    };
    const response1 = await request(appUrl)
      .post("/api/v4/proposals")
      .send(proposalToCreate1)
      .auth(accessTokenProposalIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);
    proposalIdPublished1 = response1.body.proposalId;

    const uniqueId2 = `${ProposalCorrectPublishedV4_2.proposalId}-${uuidv4()}`;
    const proposalToCreate2 = {
      ...ProposalCorrectPublishedV4_2,
      proposalId: uniqueId2,
    };
    const response2 = await request(appUrl)
      .post("/api/v4/proposals")
      .send(proposalToCreate2)
      .auth(accessTokenProposalIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode);
    proposalIdPublished2 = response2.body.proposalId;
  });

  after(async () => {
    // Clean up
    if (proposalIdPublished1) {
      await request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalIdPublished1))
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);
    }
    if (proposalIdPublished2) {
      await request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalIdPublished2))
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode);
    }
    await db.collection("Proposal").deleteMany({ proposalId: /^public-proposal-/ });
  });

  describe("Proposals v4 public findAll tests", () => {
    it("3100:0100: should list public proposals without auth", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("3100:0101: should list public proposals with filter", async () => {
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
          res.body[0].should.have
            .property("proposalId")
            .and.equal(proposalIdPublished1);
        });
    });

    it("3100:0102: should list public proposals with pagination", async () => {
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

    it("3100:0103: should reject malformed filter JSON", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: 'not-valid-json{',
        })
        .expect(TestData.BadRequestStatusCode);
    });

    it("3100:0104: should handle empty filter object", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({}),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("3100:0105: should list proposals with sorting", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: {},
            limits: { sort: { title: "asc" } },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          if (res.body.length > 1) {
            for (let i = 1; i < res.body.length; i++) {
              assert(
                res.body[i - 1].title <= res.body[i].title,
                `titles not sorted: "${res.body[i - 1].title}" > "${res.body[i].title}"`,
              );
            }
          }
        });
    });

    it("3100:0106: should list proposals with field selection", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: {},
            fields: { proposalId: true, title: true },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          if (res.body.length > 0) {
            res.body[0].should.have.property("proposalId");
            res.body[0].should.have.property("title");
            res.body[0].should.not.have.property("email");
          }
        });
    });

    it("3100:0107: should handle very large limit values", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: {},
            limits: { limit: 9999, skip: 0 },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("3100:0108: should handle negative skip/limit values", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: {},
            limits: { limit: -1, skip: -5 },
          }),
        })
        .expect(TestData.BadRequestStatusCode);
    });
  });

  describe("Proposals v4 public count tests", () => {
    it("3100:0200: should count public proposals without auth", async () => {
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

    it("3100:0201: should count public proposals with filter", async () => {
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

    it("3100:0202: should count with complex filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/count")
        .query({
          filter: JSON.stringify({
            where: {
              ownerGroup: "proposalingestor",
              title: { $regex: "public", $options: "i" },
            },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("count");
          res.body.count.should.be.a("number");
        });
    });

    it("3100:0203: should count with empty filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/count")
        .query({
          filter: JSON.stringify({}),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("count");
          res.body.count.should.be.a("number");
        });
    });
  });

  describe("Proposals v4 public fullfacet tests", () => {
    it("3100:0300: should get fullfacet for public proposals without auth", async () => {
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

    it("3100:0301: should get fullfacet with fields filter", async () => {
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

    it("3100:0302: should get fullfacet with all facet types", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/fullfacet")
        .query({
          filters: JSON.stringify({
            facets: ["ownerGroup", "type", "keywords", "isPublished", "email"],
            fields: {},
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.should.have.lengthOf.at.least(1);
        });
    });

    it("3100:0303: should handle empty facet request", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/fullfacet")
        .query({
          filters: JSON.stringify({
            facets: [],
            fields: {},
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
    it("3100:0400: should find first public proposal matching filter without auth", async () => {
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
          res.body.should.have
            .property("proposalId")
            .and.equal(proposalIdPublished1);
        });
    });

    it("3100:0401: should find first public proposal with include without auth", async () => {
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
          res.body.should.have
            .property("proposalId")
            .and.equal(proposalIdPublished2);
        });
    });

    it("3100:0402: should findOne with complex filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/findOne")
        .query({
          filter: JSON.stringify({
            where: {
              ownerGroup: "proposalingestor",
              type: "Default Proposal",
            },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("ownerGroup").and.equal("proposalingestor");
          res.body.should.have.property("type").and.equal("Default Proposal");
        });
    });
  });

  describe("Proposals v4 public findById tests", () => {
    it("3100:0500: should get public proposal by proposalId without auth", async () => {
      return request(appUrl)
        .get(
          "/api/v4/proposals/public/" +
            encodeURIComponent(proposalIdPublished1),
        )
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("proposalId")
            .and.equal(proposalIdPublished1);
          res.body.should.have.property("isPublished").and.equal(true);
        });
    });

    it("3100:0501: should get public proposal with include without auth", async () => {
      return request(appUrl)
        .get(
          "/api/v4/proposals/public/" +
            encodeURIComponent(proposalIdPublished2) +
            "?include=samples",
        )
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("proposalId")
            .and.equal(proposalIdPublished2);
          res.body.should.have.property("isPublished").and.equal(true);
        });
    });

    it("3100:0502: should not find unpublished proposal via public endpoint", async () => {
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
        .auth(accessTokenProposalIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);

      // Try to get it via public endpoint - should not be found
      return request(appUrl)
        .get(
          "/api/v4/proposals/public/" +
            encodeURIComponent(unpublishedProposal.proposalId),
        )
        .expect(TestData.NotFoundStatusCode);
    });

    it("3100:0503: should not find non-existent public proposal", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public/nonexistent-public-proposal")
        .expect(TestData.NotFoundStatusCode);
    });

    it("3100:0504: should handle special characters in proposalId", async () => {
      const specialProposalId = `test-public_with.special-chars-${uuidv4()}`;
      const specialProposal = {
        ...ProposalCorrectPublishedV4_1,
        proposalId: specialProposalId,
      };

      await request(appUrl)
        .post("/api/v4/proposals")
        .send(specialProposal)
        .auth(accessTokenProposalIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);

      return request(appUrl)
        .get("/api/v4/proposals/public/" + encodeURIComponent(specialProposalId))
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(specialProposalId);
        });
    });
  });

  describe("Proposals v4 public edge cases", () => {
    it("3100:0600: should handle filter with text search", async () => {
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
          res.body.every(
            (p) => p.title && p.title.toLowerCase().includes("public"),
          ).should.be.true;
        });
    });

    it("3100:0601: should handle filter with type", async () => {
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

    it("3100:0602: should handle filter with keywords", async () => {
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

    it("3100:0603: should filter by date range", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: {
              createdAt: {
                $gte: "2020-01-01T00:00:00.000Z",
                $lte: "2026-12-31T23:59:59.000Z",
              },
            },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("3100:0604: should handle empty result set", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: { proposalId: "nonexistent-proposal-id-that-does-not-exist" },
          }),
        })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.should.have.lengthOf(0);
        });
    });

    it("3100:0605: should handle unicode in filter values", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/public")
        .query({
          filter: JSON.stringify({
            where: { title: { $regex: "测试", $options: "i" } },
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
