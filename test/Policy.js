"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenArchiveManager = null,
  accessTokenAdminIngestor = null,
  id = null;

const testdataset = { ...TestData.PolicyCorrect };

describe("1300: Policy: Simple Policy tests", () => {
  before(async () => {
    await db.collection("Policy").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  it("0010: adds a new policy", async () => {
    return request(appUrl)
      .post("/api/v3/Policies")
      .send(testdataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("manager").and.be.string;
        res.body.should.have.property("ownerGroup").and.be.string;
        id = encodeURIComponent(res.body["id"]);
      });
  });

  it("0020: should fetch this new policy", async () => {
    return request(appUrl)
      .get("/api/v3/Policies/" + id)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0030: updates this existing policy", async () => {
    return request(appUrl)
      .patch("/api/v3/Policies/" + id)
      .send({ ownerGroup: "test_test" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/);
  });

  it("0035: fetch with no admin user returns 403", async () => {
    const accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
    return request(appUrl)
      .post("/api/v3/Policies")
      .send(testdataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.CreationForbiddenStatusCode);
  });

  it("0040: should delete this policy", async () => {
    return request(appUrl)
      .delete("/api/v3/Policies/" + id)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .expect("Content-Type", /json/);
  });
});

describe("1301: Policy: v3 jobPolicies mapping tests", () => {
  let policyId = null;

  before(async () => {
    await db
      .collection("Policy")
      .deleteMany({ ownerGroup: /^v3-jobpolicies-test/ });

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });
  });

  after(async () => {
    if (policyId) {
      await request(appUrl)
        .delete("/api/v3/Policies/" + policyId)
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` });
    }
  });

  it("0100: adds a policy with legacy fields, which are stored under jobPolicies and not exposed in v3 output", async () => {
    return request(appUrl)
      .post("/api/v3/Policies")
      .send({
        ...testdataset,
        ownerGroup: "v3-jobpolicies-test",
        manager: [TestData.Accounts["adminIngestor"]["email"]],
        tapeRedundancy: "high",
        autoArchive: false,
        autoArchiveDelay: 21,
        archiveEmailsToBeNotified: ["a@example.com"],
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.tapeRedundancy.should.equal("high");
        res.body.autoArchive.should.equal(false);
        res.body.autoArchiveDelay.should.equal(21);
        res.body.archiveEmailsToBeNotified.should.deep.equal(["a@example.com"]);
        res.body.should.not.have.property("jobPolicies");
        policyId = encodeURIComponent(res.body["id"]);
      });
  });

  it("0105: response includes audit fields (createdBy, updatedBy, isPublished, createdAt, updatedAt)", async () => {
    return request(appUrl)
      .get("/api/v3/Policies/" + policyId)
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

  it("0110: patching one legacy field does not clobber sibling jobPolicies fields", async () => {
    return request(appUrl)
      .patch("/api/v3/Policies/" + policyId)
      .send({ tapeRedundancy: "medium" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .then((res) => {
        res.body.tapeRedundancy.should.equal("medium");
        // untouched siblings within the same jobPolicies.archive entry
        // must survive the partial update
        res.body.autoArchive.should.equal(false);
        res.body.autoArchiveDelay.should.equal(21);
        res.body.archiveEmailsToBeNotified.should.deep.equal(["a@example.com"]);
      });
  });

  it("0120: count filters using a v3 field name translated to its jobPolicies path", async () => {
    return request(appUrl)
      .get("/api/v3/Policies/count")
      .query({
        where: JSON.stringify({
          ownerGroup: "v3-jobpolicies-test",
          tapeRedundancy: "medium",
        }),
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.property("count").and.equal(1);
      });
  });

  it("0130: findAll with a filter returns the policy matching a v3 field name", async () => {
    return request(appUrl)
      .get("/api/v3/Policies")
      .query({
        filter: JSON.stringify({
          where: { ownerGroup: "v3-jobpolicies-test" },
        }),
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.be.an("array");
        res.body.should.have.length(1);
        res.body[0].tapeRedundancy.should.equal("medium");
      });
  });

  it("0140: updateWhere updates the policy for the given ownerGroup with legacy fields mapped correctly", async () => {
    return request(appUrl)
      .post("/api/v3/Policies/updateWhere")
      .send({
        ownerGroupList: "v3-jobpolicies-test",
        data: { tapeRedundancy: "low", embargoPeriod: 5 },
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then(async () => {
        const res = await request(appUrl)
          .get("/api/v3/Policies/" + policyId)
          .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` });
        res.body.tapeRedundancy.should.equal("low");
        res.body.embargoPeriod.should.equal(5);
        // untouched sibling from 0110 must still survive
        res.body.autoArchiveDelay.should.equal(21);
      });
  });
});

describe("1302: Policy: v3 order/skip/limit tests", () => {
  const groups = ["v3-order-test-a", "v3-order-test-b", "v3-order-test-c"];

  before(async () => {
    await db.collection("Policy").deleteMany({ ownerGroup: /^v3-order-test/ });

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    for (const ownerGroup of groups) {
      await request(appUrl)
        .post("/api/v3/Policies")
        .send({ ...testdataset, ownerGroup })
        .set("Accept", "application/json")
        .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
        .expect(TestData.EntryCreatedStatusCode);
    }
  });

  after(async () => {
    await db.collection("Policy").deleteMany({ ownerGroup: /^v3-order-test/ });
  });

  it("0150: order/skip/limit (flat v3 shape) apply a descending sort with a cap", async () => {
    return request(appUrl)
      .get("/api/v3/Policies")
      .query({
        filter: JSON.stringify({
          where: { ownerGroup: { $in: groups } },
          order: "ownerGroup:desc",
          skip: 0,
          limit: 1,
        }),
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.length(1);
        res.body[0].ownerGroup.should.equal("v3-order-test-c");
      });
  });

  it("0160: order without an explicit direction defaults to ascending", async () => {
    return request(appUrl)
      .get("/api/v3/Policies")
      .query({
        filter: JSON.stringify({
          where: { ownerGroup: { $in: groups } },
          order: "ownerGroup",
          skip: 0,
          limit: 1,
        }),
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .then((res) => {
        res.body.should.have.length(1);
        res.body[0].ownerGroup.should.equal("v3-order-test-a");
      });
  });
});

describe("1303: Policy: v3 storage-split edge cases", () => {
  let policyId = null;

  before(async () => {
    await db
      .collection("Policy")
      .deleteMany({ ownerGroup: "v3-split-edge-cases-test" });

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"]["password"],
    });
  });

  after(async () => {
    await db
      .collection("Policy")
      .deleteMany({ ownerGroup: "v3-split-edge-cases-test" });
  });

  it("0200: creating a v3 policy stores it as separate archive and retrieve documents", async () => {
    return request(appUrl)
      .post("/api/v3/Policies")
      .send({ ...testdataset, ownerGroup: "v3-split-edge-cases-test" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode)
      .then(async (res) => {
        policyId = encodeURIComponent(res.body["id"]);
        const docs = await db
          .collection("Policy")
          .find({ ownerGroup: "v3-split-edge-cases-test" })
          .toArray();
        docs.should.have.length(2);
        docs
          .map((d) => d.type)
          .sort()
          .should.deep.equal(["archive", "retrieve"]);
      });
  });

  it("0210: patching a retrieve-only field upserts the retrieve document when its sibling was removed out-of-band", async () => {
    // Simulate a sibling document missing (e.g. a pre-existing data gap) by
    // deleting the underlying retrieve-type document directly, bypassing
    // the API.
    await db.collection("Policy").deleteOne({
      ownerGroup: "v3-split-edge-cases-test",
      type: "retrieve",
    });
    const beforeDocs = await db
      .collection("Policy")
      .find({ ownerGroup: "v3-split-edge-cases-test" })
      .toArray();
    beforeDocs.should.have.length(1);

    return request(appUrl)
      .patch("/api/v3/Policies/" + policyId)
      .send({ retrieveEmailNotification: true })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .then(async (res) => {
        res.body.retrieveEmailNotification.should.equal(true);
        const afterDocs = await db
          .collection("Policy")
          .find({ ownerGroup: "v3-split-edge-cases-test" })
          .toArray();
        afterDocs.should.have.length(2);
      });
  });

  it("0220: deleting a v3 policy removes both the archive and retrieve documents", async () => {
    return request(appUrl)
      .delete("/api/v3/Policies/" + policyId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .then(async () => {
        const docs = await db
          .collection("Policy")
          .find({ ownerGroup: "v3-split-edge-cases-test" })
          .toArray();
        docs.should.have.length(0);
      });
  });

  it("0230: deleting a v3 policy does not remove documents already marked supersededBy", async () => {
    const createRes = await request(appUrl)
      .post("/api/v3/Policies")
      .send({ ...testdataset, ownerGroup: "v3-split-edge-cases-test" })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.EntryCreatedStatusCode);
    const newPolicyId = encodeURIComponent(createRes.body["id"]);

    const liveArchive = await db.collection("Policy").findOne({
      ownerGroup: "v3-split-edge-cases-test",
      type: "archive",
    });

    // Simulate a historical duplicate the way the type-split migration
    // leaves one behind: a document sharing (ownerGroup, type) with the
    // live one, but marked supersededBy instead of being deleted - kept
    // for audit purposes and never surfaced by normal reads.
    await db.collection("Policy").insertOne({
      ...liveArchive,
      _id: "v3-split-edge-cases-test-superseded",
      supersededBy: liveArchive._id,
    });

    return request(appUrl)
      .delete("/api/v3/Policies/" + newPolicyId)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenArchiveManager}` })
      .expect(TestData.SuccessfulDeleteStatusCode)
      .then(async () => {
        // The live archive and retrieve documents are gone, but the
        // superseded historical document must survive an unrelated delete.
        const remaining = await db
          .collection("Policy")
          .find({ ownerGroup: "v3-split-edge-cases-test" })
          .toArray();
        remaining.should.have.length(1);
        remaining[0]._id.should.equal("v3-split-edge-cases-test-superseded");
        remaining[0].supersededBy.should.equal(liveArchive._id);
      });
  });
});
