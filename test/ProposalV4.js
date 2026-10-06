"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");
const assert = require("node:assert");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  proposalId1 = null,
  proposalId2 = null,
  proposalId3 = null,
  proposal1 = null;

const ProposalCorrectMinV4 = TestData.ProposalCorrectMinV4;

const ProposalCorrectCompleteV4 = TestData.ProposalCorrectCompleteV4;

describe("3000: Proposals v4 tests", () => {
  before(async () => {
    db.collection("Proposal").deleteMany({});

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

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  after(async () => {
    // Clean up created proposals
    db.collection("Proposal").deleteMany({});
  });

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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("3000:0103: should reject proposal with invalid email format", async () => {
      const invalidEmailProposal = {
        ...ProposalCorrectMinV4,
        email: "not-an-email",
      };
      return request(appUrl)
        .post("/api/v4/proposals/isValid")
        .send(invalidEmailProposal)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(false);
        });
    });

    it("3000:0104: should reject proposal with missing required fields", async () => {
      const incompleteProposal = {
        proposalId: "incomplete-v4",
        title: "Missing required fields",
      };
      return request(appUrl)
        .post("/api/v4/proposals/isValid")
        .send(incompleteProposal)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(false);
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
      proposal1 = {
        ...ProposalCorrectMinV4,
        proposalId: uniqueProposalId,
      };

      return request(appUrl)
        .post("/api/v4/proposals")
        .send(proposal1)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("proposalId")
            .and.equal(proposal1.proposalId);
          res.body.should.have.property("title").and.equal(proposal1.title);
          res.body.should.have.property("email").and.equal(proposal1.email);
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
        .send(proposal1)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.ConflictStatusCode);
    });

    it("3000:0203: should create complete proposal", async () => {
      const uniqueProposalId = `${ProposalCorrectCompleteV4.proposalId}-${uuidv4()}`;
      const proposalToCreate = {
        ...ProposalCorrectCompleteV4,
        proposalId: uniqueProposalId,
      };

      return request(appUrl)
        .post("/api/v4/proposals")
        .send(proposalToCreate)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("proposalId")
            .and.equal(uniqueProposalId);
          res.body.should.have
            .property("title")
            .and.equal(proposalToCreate.title);
          res.body.should.have
            .property("abstract")
            .and.equal(proposalToCreate.abstract);
          res.body.should.have
            .property("pi_email")
            .and.equal(proposalToCreate.pi_email);
          res.body.should.have
            .property("keywords")
            .and.deep.equal(proposalToCreate.keywords);
          res.body.should.have
            .property("MeasurementPeriodList")
            .and.have.lengthOf(1);
          proposalId2 = res.body.proposalId;
        });
    });

    it("3000:0204: should reject proposal with invalid email format", async () => {
      const invalidEmailProposal = {
        ...ProposalCorrectMinV4,
        proposalId: `invalid-email-${uuidv4()}`,
        email: "not-an-email",
      };
      return request(appUrl)
        .post("/api/v4/proposals")
        .send(invalidEmailProposal)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode);
    });

    it("3000:0205: should create proposal with all optional fields", async () => {
      const uniqueProposalId = `${ProposalCorrectCompleteV4.proposalId}-all-optional-${uuidv4()}`;
      const proposalWithAllFields = {
        ...ProposalCorrectCompleteV4,
        proposalId: uniqueProposalId,
        firstname: "TestFirst",
        lastname: "TestLast",
        pi_firstname: "PIFirst",
        pi_lastname: "PILast",
        instrumentIds: ["instrument1", "instrument2"],
        type: "Default Proposal",
        isPublished: false,
        metadata: { customField: "customValue", anotherField: "anotherValue" },
      };

      return request(appUrl)
        .post("/api/v4/proposals")
        .send(proposalWithAllFields)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(uniqueProposalId);
          res.body.should.have.property("firstname").and.equal("TestFirst");
          res.body.should.have.property("lastname").and.equal("TestLast");
          res.body.should.have.property("metadata").and.deep.equal(proposalWithAllFields.metadata);
          proposalId3 = res.body.proposalId;
        });
    });

    it("3000:1000: should handle concurrent create requests", async () => {
      const duplicateProposalId = `concurrent-test-${uuidv4()}`;
      const proposalData = {
        ...ProposalCorrectMinV4,
        proposalId: duplicateProposalId,
      };

      const requests = [
        request(appUrl)
          .post("/api/v4/proposals")
          .send(proposalData)
          .auth(accessTokenAdminIngestor, { type: "bearer" }),
        request(appUrl)
          .post("/api/v4/proposals")
          .send(proposalData)
          .auth(accessTokenAdminIngestor, { type: "bearer" }),
      ];

      const responses = await Promise.all(
        requests.map((req) => req.catch((e) => e)),
      );

      const successCount = responses.filter(
        (res) => res.status === TestData.EntryCreatedStatusCode,
      ).length;
      const conflictCount = responses.filter(
        (res) => res.status === TestData.ConflictStatusCode,
      ).length;

      successCount.should.equal(1);
      conflictCount.should.equal(1);
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.should.have.lengthOf.at.most(1);
        });
    });

    it("3000:0304: should list proposals with sorting", async () => {
      return request(appUrl)
        .get("/api/v4/proposals")
        .query({
          filter: JSON.stringify({
            where: {},
            order: ["createdAt DESC"],
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          if (res.body.length > 1) {
            const dates = res.body.map((p) => new Date(p.createdAt));
            for (let i = 1; i < dates.length; i++) {
              dates[i - 1].should.be.at.least(dates[i]);
            }
          }
        });
    });

    it("3000:0305: should list proposals with field selection", async () => {
      return request(appUrl)
        .get("/api/v4/proposals")
        .query({
          filter: JSON.stringify({
            where: {},
            fields: { proposalId: true, title: true },
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
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

    it("3000:0306: should handle very large limit values", async () => {
      return request(appUrl)
        .get("/api/v4/proposals")
        .query({
          filter: JSON.stringify({
            where: {},
            limits: { limit: 9999, skip: 0 },
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("3000:0307: should handle negative skip/limit values", async () => {
      return request(appUrl)
        .get("/api/v4/proposals")
        .query({
          filter: JSON.stringify({
            where: {},
            limits: { limit: -1, skip: -5 },
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode);
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId2);
        });
    });

    it("3000:0403: should findOne with complex filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/findOne")
        .query({
          filter: JSON.stringify({
            where: { ownerGroup: "proposalingestor" },
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("ownerGroup").and.equal("proposalingestor");
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("count");
          res.body.count.should.be.at.least(1);
        });
    });

    it("3000:0503: should count with complex filter", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/count")
        .query({
          filter: JSON.stringify({
            where: {
              ownerGroup: "proposalingestor",
              title: { $regex: "test", $options: "i" },
            },
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("count");
          res.body.count.should.be.a("number");
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
        });
    });

    it("3000:0602: should get fullfacet with all facet types", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/fullfacet")
        .query({
          filters: JSON.stringify({
            facets: ["ownerGroup", "type", "keywords", "isPublished"],
            fields: {},
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          assert(Array.isArray(res.body));
          res.body.should.have.lengthOf.at.least(1);
        });
    });

    it("3000:0603: should handle empty facet request", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/fullfacet")
        .query({
          filters: JSON.stringify({
            facets: [],
            fields: {},
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
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
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
        });
    });

    it("3000:0702: should get proposal with include", async () => {
      return request(appUrl)
        .get(
          "/api/v4/proposals/" +
            encodeURIComponent(proposalId2) +
            "?include=samples",
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId2);
        });
    });

    it("3000:0703: should not find non-existent proposal", async () => {
      return request(appUrl)
        .get("/api/v4/proposals/nonexistent-proposal")
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode);
    });

    it("3000:0704: should handle special characters in proposalId", async () => {
      const specialProposalId = `test-proposal_with.special-chars-${uuidv4()}`;
      const specialProposal = {
        ...ProposalCorrectMinV4,
        proposalId: specialProposalId,
      };

      await request(appUrl)
        .post("/api/v4/proposals")
        .send(specialProposal)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);

      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(specialProposalId))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(specialProposalId);
        });
    });

    it("3000:0705: should handle unicode in proposal fields", async () => {
      const unicodeProposalId = `unicode-proposal-${uuidv4()}`;
      const unicodeProposal = {
        ...ProposalCorrectMinV4,
        proposalId: unicodeProposalId,
        title: "测试 Proposal 测试",
        abstract: "这是一个测试提案 with émojis 🎉",
      };

      await request(appUrl)
        .post("/api/v4/proposals")
        .send(unicodeProposal)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);

      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(unicodeProposalId))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(unicodeProposalId);
          res.body.should.have.property("title").and.equal(unicodeProposal.title);
          res.body.should.have.property("abstract").and.equal(unicodeProposal.abstract);
        });
    });
  });

  describe("Proposals v4 update tests", () => {
    it("3000:0800: should not be able to patch proposal if not logged in", async () => {
      return request(appUrl)
        .patch("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send({ title: "Updated title" })
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0801: should patch proposal", async () => {
      const newTitle = "Patch updated title v4";
      return request(appUrl)
        .patch("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send({ title: newTitle })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
          res.body.should.have.property("title").and.equal(newTitle);
        });
    });

    it("3000:0802: should not be able to put proposal if not logged in", async () => {
      const { proposalId, ...updatedProposal } = {
        ...ProposalCorrectMinV4,
        title: "Put update title v4",
      };

      return request(appUrl)
        .put("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send(updatedProposal)
        .expect(TestData.AccessForbiddenStatusCode);
    });
    it("3000:0803: should replace proposal with PUT", async () => {
      const { proposalId, ...updatedProposal } = {
        ...ProposalCorrectMinV4,
        title: "Put update title v4",
      };

      return request(appUrl)
        .put("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send(updatedProposal)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPostStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
          res.body.should.have
            .property("title")
            .and.equal(updatedProposal.title);
        });
    });

    it("3000:0804: should patch nested MeasurementPeriodList", async () => {
      const newMeasurementPeriod = {
        instrument: "ESS3-3",
        start: "2025-01-01T10:00:00.000Z",
        end: "2025-01-02T10:00:00.000Z",
        comment: "New measurement period",
      };
      return request(appUrl)
        .patch("/api/v4/proposals/" + encodeURIComponent(proposalId2))
        .set("content-type", "application/merge-patch+json")
        .send({
          MeasurementPeriodList: [newMeasurementPeriod],
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("MeasurementPeriodList")
            .and.be.an("array")
            .and.have.lengthOf(1);
          res.body.MeasurementPeriodList[0].should.have
            .property("instrument")
            .and.equal(newMeasurementPeriod.instrument);
        });
    });

    it("3000:0805: should reject PATCH with invalid field update", async () => {
      return request(appUrl)
        .patch("/api/v4/proposals/" + encodeURIComponent(proposalId2))
        .send({ email: "invalid-email-format" })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode);
    });

    it("3000:0806: should PUT with partial data preserve unchanged fields", async () => {
      const { proposalId, ...updatedProposal } = {
        ...ProposalCorrectMinV4,
        title: "Put update title v4 partial",
      };

      await request(appUrl)
        .put("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send(updatedProposal)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPostStatusCode);

      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
          res.body.should.have.property("title").and.equal(updatedProposal.title);
          res.body.should.have.property("email").and.equal(ProposalCorrectMinV4.email);
          res.body.should.have.property("ownerGroup").and.equal(ProposalCorrectMinV4.ownerGroup);
        });
    });

    it("3000:0807: should handle empty PATCH body", async () => {
      return request(appUrl)
        .patch("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .send({})
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode);
    });
  });

  describe("Proposals v4 delete tests", () => {
    it("3000:0900: should not be able to delete proposal if not logged in", async () => {
      // Then try to delete without auth
      return request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0901: should not be able to delete proposal without delete permissions", async () => {
      // delete proposal as adminIngestor, which does not have correct permissions
      return request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode);
    });

    it("3000:0902: should be able to delete proposal 1 with delete permissions", async () => {
      return request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId1);
        });
    });

    it("3000:0903: should be able to delete proposal 2 with delete permissions", async () => {
      return request(appUrl)
        .delete("/api/v4/proposals/" + encodeURIComponent(proposalId2))
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("proposalId").and.equal(proposalId2);
        });
    });

    it("3000:0904: should not find proposal 1", async () => {
      // Try to get it - should not be found
      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(proposalId1))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode);
    });

    it("3000:0905: should not find proposal 2", async () => {
      // Try to get it - should not be found
      return request(appUrl)
        .get("/api/v4/proposals/" + encodeURIComponent(proposalId2))
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode);
    });

    it("3000:0906: should not delete non-existent proposal", async () => {
      return request(appUrl)
        .delete("/api/v4/proposals/nonexistent-proposal-v4")
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode);
    });
  });
});
