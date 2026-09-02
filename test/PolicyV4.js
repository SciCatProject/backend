"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const assert = require("node:assert");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null;

describe("1310: Policy v4 tests", () => {
  before(async () => {
    await db.collection("Policy").deleteMany({ ownerGroup: /^v4-policy-test/ });

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
  });

  describe("Admin user CRUD tests (adminIngestor)", () => {
    let policyId = null;

    after(async () => {
      if (policyId) {
        await request(appUrl)
          .delete("/api/v3/Policies/" + encodeURIComponent(policyId))
          .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` });
      }
    });

    it("0100: should create a new policy with jobPolicies", async () => {
      return request(appUrl)
        .post("/api/v4/policies")
        .send({
          ownerGroup: "v4-policy-test",
          manager: ["adminIngestor"],
          jobPolicies: {
            archive: { tapeRedundancy: "high", emailTo: ["a@example.com"] },
            retrieve: { emailTo: ["b@example.com"] },
          },
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("_id").and.be.a("string");
          res.body.ownerGroup.should.equal("v4-policy-test");
          res.body.jobPolicies.archive.tapeRedundancy.should.equal("high");
          res.body.jobPolicies.archive.emailTo.should.deep.equal([
            "a@example.com",
          ]);
          res.body.jobPolicies.retrieve.emailTo.should.deep.equal([
            "b@example.com",
          ]);
          policyId = res.body._id;
        });
    });

    it("0105: response includes audit fields (createdBy, updatedBy, isPublished, createdAt, updatedAt)", async () => {
      return request(appUrl)
        .get(`/api/v4/policies/${encodeURIComponent(policyId)}`)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .then((res) => {
          res.body.should.have.property("createdBy").and.be.a("string");
          res.body.should.have.property("updatedBy").and.be.a("string");
          res.body.should.have.property("isPublished").and.equal(false);
          res.body.should.have.property("createdAt");
          res.body.should.have.property("updatedAt");
        });
    });

    it("0110: should fetch the policy by id", async () => {
      return request(appUrl)
        .get(`/api/v4/policies/${encodeURIComponent(policyId)}`)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body._id.should.equal(policyId);
        });
    });

    it("0115: should fetch all policies with a filter matching ownerGroup", async () => {
      return request(appUrl)
        .get("/api/v4/policies")
        .query({
          filter: JSON.stringify({ where: { ownerGroup: "v4-policy-test" } }),
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(1);
          res.body[0]._id.should.equal(policyId);
        });
    });

    it("0120: should return 404 for a non-existent policy id", async () => {
      return request(appUrl)
        .get("/api/v4/policies/does-not-exist")
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.NotFoundStatusCode);
    });

    it("0130: should partially update jobPolicies.archive without clobbering sibling fields", async () => {
      return request(appUrl)
        .patch(`/api/v4/policies/${encodeURIComponent(policyId)}`)
        .send({ jobPolicies: { archive: { tapeRedundancy: "medium" } } })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.jobPolicies.archive.tapeRedundancy.should.equal("medium");
          // untouched sibling within the same archive entry must survive
          res.body.jobPolicies.archive.emailTo.should.deep.equal([
            "a@example.com",
          ]);
          // untouched retrieve entry must survive too
          res.body.jobPolicies.retrieve.emailTo.should.deep.equal([
            "b@example.com",
          ]);
        });
    });

    it("0140: should return 404 when patching a non-existent policy id", async () => {
      return request(appUrl)
        .patch("/api/v4/policies/does-not-exist")
        .send({ manager: ["someone"] })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.NotFoundStatusCode);
    });
  });

  describe("Filter tests (fields, limits, order)", () => {
    const groups = [
      "v4-policy-filter-test-a",
      "v4-policy-filter-test-b",
      "v4-policy-filter-test-c",
    ];

    before(async () => {
      await db
        .collection("Policy")
        .deleteMany({ ownerGroup: /^v4-policy-filter-test/ });

      for (const ownerGroup of groups) {
        await request(appUrl)
          .post("/api/v4/policies")
          .send({ ownerGroup, manager: ["adminIngestor"] })
          .set("Accept", "application/json")
          .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
          .expect(TestData.EntryCreatedStatusCode);
      }
    });

    after(async () => {
      await db
        .collection("Policy")
        .deleteMany({ ownerGroup: /^v4-policy-filter-test/ });
    });

    it("0150: fields limits the response to only the requested fields", async () => {
      return request(appUrl)
        .get("/api/v4/policies")
        .query({
          filter: JSON.stringify({
            where: { ownerGroup: "v4-policy-filter-test-a" },
            fields: ["ownerGroup", "manager"],
          }),
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .then((res) => {
          res.body.should.have.length(1);
          res.body[0].should.have.property("ownerGroup");
          res.body[0].should.have.property("manager");
          res.body[0].should.not.have.property("jobPolicies");
          res.body[0].should.not.have.property("createdBy");
        });
    });

    it("0160: limits.order/skip/limit (nested v4 shape) apply a descending sort with a cap", async () => {
      return request(appUrl)
        .get("/api/v4/policies")
        .query({
          filter: JSON.stringify({
            where: { ownerGroup: { $in: groups } },
            limits: { order: "ownerGroup:desc", skip: 0, limit: 1 },
          }),
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .then((res) => {
          res.body.should.have.length(1);
          res.body[0].ownerGroup.should.equal("v4-policy-filter-test-c");
        });
    });

    it("0170: limits.order without an explicit direction defaults to ascending", async () => {
      return request(appUrl)
        .get("/api/v4/policies")
        .query({
          filter: JSON.stringify({
            where: { ownerGroup: { $in: groups } },
            limits: { order: "ownerGroup", skip: 0, limit: 1 },
          }),
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .then((res) => {
          res.body.should.have.length(1);
          res.body[0].ownerGroup.should.equal("v4-policy-filter-test-a");
        });
    });
  });

  describe("Unprivileged user access tests (user1)", () => {
    it("0200: user1 cannot create a policy", async () => {
      return request(appUrl)
        .post("/api/v4/policies")
        .send({ ownerGroup: "v4-policy-test-forbidden" })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenUser1}` })
        .expect(TestData.CreationForbiddenStatusCode);
    });
  });

  describe("Optimistic concurrency control tests", () => {
    let policyId = null;

    after(async () => {
      if (policyId) {
        await request(appUrl)
          .delete("/api/v3/Policies/" + encodeURIComponent(policyId))
          .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` });
      }
    });

    it("0300: should fail one request with HTTP 412 when two requests try to update the same policy", async () => {
      const res = await request(appUrl)
        .post("/api/v4/policies")
        .send({ ownerGroup: "v4-policy-test-occ", manager: ["adminIngestor"] })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode);
      policyId = res.body._id;
      const id = encodeURIComponent(policyId);

      const [res1, res2] = await Promise.all([
        request(appUrl)
          .patch(`/api/v4/policies/${id}`)
          .send({ manager: ["updated1"] })
          .set("if-unmodified-since", res.body.updatedAt)
          .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` }),
        request(appUrl)
          .patch(`/api/v4/policies/${id}`)
          .send({ manager: ["updated2"] })
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

    it("0310: should return 412 when patching with a stale if-unmodified-since date", async () => {
      const res = await request(appUrl)
        .get(`/api/v4/policies/${encodeURIComponent(policyId)}`)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode);
      const staleDate = new Date(
        new Date(res.body.updatedAt).getTime() - 1000,
      ).toISOString();

      return request(appUrl)
        .patch(`/api/v4/policies/${encodeURIComponent(policyId)}`)
        .send({ manager: ["updated3"] })
        .set("if-unmodified-since", staleDate)
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.PreconditionFailedStatusCode);
    });
  });
});
