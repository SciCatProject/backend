"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

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
});
