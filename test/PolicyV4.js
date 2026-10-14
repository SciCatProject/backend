"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenArchiveManager = null,
  accessTokenUser1 = null;

describe("1310: Policy v4 tests", () => {
  before(async () => {
    await db.collection("Policy").deleteMany({ ownerGroup: /^v4-policy-test/ });

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
  });

  describe("Admin user CRUD tests (adminIngestor)", () => {
    let archivePolicyId = null;
    let retrievePolicyId = null;

    after(async () => {
      await db
        .collection("Policy")
        .deleteMany({ ownerGroup: "v4-policy-test" });
    });

    it("0100: should create a new archive-type policy", async () => {
      return request(appUrl)
        .post("/api/v4/policies")
        .send({
          ownerGroup: "v4-policy-test",
          manager: ["adminIngestor"],
          type: "archive",
          emailTo: ["a@example.com"],
          policyParams: { tapeRedundancy: "high" },
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("_id").and.be.a("string");
          res.body.ownerGroup.should.equal("v4-policy-test");
          res.body.type.should.equal("archive");
          res.body.policyParams.tapeRedundancy.should.equal("high");
          res.body.emailTo.should.deep.equal(["a@example.com"]);
          archivePolicyId = res.body._id;
        });
    });

    it("0101: should create a retrieve-type policy for the same ownerGroup, as an independent resource", async () => {
      return request(appUrl)
        .post("/api/v4/policies")
        .send({
          ownerGroup: "v4-policy-test",
          manager: ["adminIngestor"],
          type: "retrieve",
          emailTo: ["b@example.com"],
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.type.should.equal("retrieve");
          res.body.emailTo.should.deep.equal(["b@example.com"]);
          // a distinct resource from the archive one above, not a shared
          // document - (ownerGroup, type) is the unique key, not ownerGroup
          // alone.
          res.body._id.should.not.equal(archivePolicyId);
          retrievePolicyId = res.body._id;
        });
    });

    it("0102: creating a second archive-type policy for the same ownerGroup conflicts", async () => {
      return request(appUrl)
        .post("/api/v4/policies")
        .send({
          ownerGroup: "v4-policy-test",
          manager: ["adminIngestor"],
          type: "archive",
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.ConflictStatusCode);
    });

    it("0105: response includes audit fields (createdBy, updatedBy, isPublished, createdAt, updatedAt)", async () => {
      return request(appUrl)
        .get(`/api/v4/policies/${encodeURIComponent(archivePolicyId)}`)
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
        .get(`/api/v4/policies/${encodeURIComponent(archivePolicyId)}`)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body._id.should.equal(archivePolicyId);
        });
    });

    it("0115: should fetch all policies with a filter matching ownerGroup (both archive and retrieve)", async () => {
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
          res.body.should.have.length(2);
          const types = res.body.map((p) => p.type).sort();
          types.should.deep.equal(["archive", "retrieve"]);
        });
    });

    it("0120: should return 404 for a non-existent policy id", async () => {
      return request(appUrl)
        .get("/api/v4/policies/does-not-exist")
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.NotFoundStatusCode);
    });

    it("0130: should replace policyParams wholesale rather than merging, while leaving untouched top-level fields alone", async () => {
      return request(appUrl)
        .patch(`/api/v4/policies/${encodeURIComponent(archivePolicyId)}`)
        .send({ policyParams: { autoArchive: true } })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          // policyParams is replaced wholesale: tapeRedundancy from 0100 is
          // gone, not merged with the new autoArchive key.
          res.body.policyParams.should.deep.equal({ autoArchive: true });
          // untouched top-level field must survive - $set only touches
          // keys present in the patch body.
          res.body.emailTo.should.deep.equal(["a@example.com"]);
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

    it("0150: should create a policy with an arbitrary, non-hardcoded job type", async () => {
      return request(appUrl)
        .post("/api/v4/policies")
        .send({
          ownerGroup: "v4-policy-test",
          manager: ["adminIngestor"],
          type: "backup",
        })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode)
        .then((res) => {
          res.body.type.should.equal("backup");
        });
    });

    it("0160: should delete the retrieve policy by id", async () => {
      // Delete requires the Delete action, which only archiveManager (via
      // DELETE_GROUPS) has - adminIngestor can create/read/update but not
      // delete.
      return request(appUrl)
        .delete(`/api/v4/policies/${encodeURIComponent(retrievePolicyId)}`)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .then((res) => {
          res.body._id.should.equal(retrievePolicyId);
        });
    });

    it("0170: deleted policy should no longer be fetchable", async () => {
      return request(appUrl)
        .get(`/api/v4/policies/${encodeURIComponent(retrievePolicyId)}`)
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.NotFoundStatusCode);
    });

    it("0180: should return 404 when deleting a non-existent policy id", async () => {
      return request(appUrl)
        .delete("/api/v4/policies/does-not-exist")
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
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
          .send({ ownerGroup, manager: ["adminIngestor"], type: "archive" })
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

    it("0190: fields limits the response to only the requested fields", async () => {
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
          res.body[0].should.not.have.property("policyParams");
          res.body[0].should.not.have.property("createdBy");
        });
    });

    it("0200: limits.order/skip/limit apply a descending sort with a cap", async () => {
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

    it("0210: limits.order without an explicit direction defaults to ascending", async () => {
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
    it("0220: user1 cannot create a policy", async () => {
      return request(appUrl)
        .post("/api/v4/policies")
        .send({ ownerGroup: "v4-policy-test-forbidden", type: "archive" })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenUser1}` })
        .expect(TestData.CreationForbiddenStatusCode);
    });
  });
});
