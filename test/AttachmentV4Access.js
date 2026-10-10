"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser3 = null,
  accessTokenUser4 = null,
  accessTokenArchiveManager = null,
  group1Relationships = [],
  group3Relationships = [],
  group4Relationships = [],
  adminIngestorRelationships = [],
  archiveManagerRelationships = [],
  publicRelationships = [],
  group4AttachmentId = null,
  archiveManagerAttachmentId = null,
  publicAttachmentId = null;

describe("Attachments v4 access tests", () => {
  before(async () => {
    db.collection("Attachment").deleteMany({});
    db.collection("Dataset").deleteMany({});
    db.collection("Proposal").deleteMany({});
    db.collection("PublishedData").deleteMany({});
    db.collection("Sample").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts.adminIngestor.password,
    });
    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts.user1.password,
    });
    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts.user3.password,
    });
    accessTokenUser4 = await utils.getToken(appUrl, {
      username: "user4",
      password: TestData.Accounts.user4.password,
    });
    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts.archiveManager.password,
    });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...TestData.RawCorrectV4,
        ownerGroup: TestData.Accounts.user1.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        group1Relationships.push({
          targetId: res.body.pid,
          targetType: "dataset",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...TestData.RawCorrectV4,
        ownerGroup: TestData.Accounts.user3.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        group3Relationships.push({
          targetId: res.body.pid,
          targetType: "dataset",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...TestData.RawCorrectV4,
        ownerGroup: TestData.Accounts.user4.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        group4Relationships.push({
          targetId: res.body.pid,
          targetType: "dataset",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...TestData.RawCorrectV4,
        ownerGroup: TestData.Accounts.adminIngestor.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        adminIngestorRelationships.push({
          targetId: res.body.pid,
          targetType: "dataset",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...TestData.RawCorrectV4,
        ownerGroup: TestData.Accounts.archiveManager.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        archiveManagerRelationships.push({
          targetId: res.body.pid,
          targetType: "dataset",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v4/datasets")
      .send({
        ...TestData.RawCorrectV4,
        isPublished: true,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        publicRelationships.push({
          targetId: res.body.pid,
          targetType: "dataset",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v3/proposals")
      .send({
        ...TestData.ProposalCorrectComplete,
        ownerGroup: TestData.Accounts.user1.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        group1Relationships.push({
          targetId: res.body.pid,
          targetType: "proposal",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v3/proposals")
      .send({
        ...TestData.ProposalCorrectComplete,
        ownerGroup: TestData.Accounts.user3.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        group3Relationships.push({
          targetId: res.body.pid,
          targetType: "proposal",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v3/proposals")
      .send({
        ...TestData.ProposalCorrectComplete,
        ownerGroup: TestData.Accounts.user4.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        group4Relationships.push({
          targetId: res.body.pid,
          targetType: "proposal",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v3/proposals")
      .send({
        ...TestData.ProposalCorrectComplete,
        ownerGroup: TestData.Accounts.adminIngestor.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        adminIngestorRelationships.push({
          targetId: res.body.pid,
          targetType: "proposal",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v3/proposals")
      .send({
        ...TestData.ProposalCorrectComplete,
        ownerGroup: TestData.Accounts.archiveManager.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        archiveMangerRelationships.push({
          targetId: res.body.pid,
          targetType: "proposal",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v3/proposals")
      .send({
        ...TestData.ProposalCorrectComplete,
        isPublished: true,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        publicRelationships.push({
          targetId: res.body.pid,
          targetType: "proposal",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v4/publisheddata")
      .send(TestData.PublishedDataV4)
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        group1Relationships.push({
          targetId: res.body.pid,
          targetType: "published_data",
          relationType: "is attached to",
        });
        group3Relationships.push({
          targetId: res.body.pid,
          targetType: "published_data",
          relationType: "is attached to",
        });
        group4Relationships.push({
          targetId: res.body.pid,
          targetType: "published_data",
          relationType: "is attached to",
        });
        adminIngestorRelationships.push({
          targetId: res.body.pid,
          targetType: "published_data",
          relationType: "is attached to",
        });
        archiveManagerRelationships.push({
          targetId: res.body.pid,
          targetType: "published_data",
          relationType: "is attached to",
        });
        publicRelationships.push({
          targetId: res.body.pid,
          targetType: "published_data",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v3/samples")
      .send({
        ...TestData.SampleCorrect,
        ownerGroup: TestData.Accounts.user1.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        group1Relationships.push({
          targetId: res.body.pid,
          targetType: "sample",
          relationType: "is attached to",
        });
        group3Relationships.push({
          targetId: res.body.pid,
          targetType: "sample",
          relationType: "is attached to",
        });
        group4Relationships.push({
          targetId: res.body.pid,
          targetType: "sample",
          relationType: "is attached to",
        });
        adminIngestorRelationships.push({
          targetId: res.body.pid,
          targetType: "sample",
          relationType: "is attached to",
        });
        archiveManagerRelationships.push({
          targetId: res.body.pid,
          targetType: "sample",
          relationType: "is attached to",
        });
        publicRelationships.push({
          targetId: res.body.pid,
          targetType: "sample",
          relationType: "is attached to",
        });
      });

    await request(appUrl)
      .post("/api/v4/attachments")
      .send({
        ...TestData.AttachmentCorrectV4,
        ownerGroup: TestData.Accounts.user4.role,
        relationships: group4Relationships,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("aid").and.be.a("string");
        group4AttachmentId = res.body.aid;
      });

    await request(appUrl)
      .post("/api/v4/attachments")
      .send({
        ...TestData.AttachmentCorrectV4,
        ownerGroup: TestData.Accounts.archiveManager.role,
        relationships: archiveManagerRelationships,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("aid").and.be.a("string");
        archiveManagerAttachmentId = res.body.aid;
      });

    await request(appUrl)
      .post("/api/v4/attachments")
      .send({
        ...TestData.AttachmentCorrectV4,
        isPublished: true,
        relationships: publicRelationships,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("aid").and.be.a("string");
        publicAttachmentId = res.body.aid;
      });
  });

  describe("Unauthenticated user access", () => {
    it("0100: cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send(TestData.AttachmentCorrectV4)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0101: cannot validate attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(TestData.AttachmentCorrectV4)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0102: can fetch only public attachments", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(1);
          const [res1] = res.body;
          res1.should.have.property("aid").and.equal(publicAttachmentId);
          res1.should.have.property("isPublished").and.equal(true);
        });
    });

    it("0103: can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("object");
          res.body.should.have.property("aid").and.equal(publicAttachmentId);
        });
    });

    it("0104: cannot fetch private attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0105: cannot update attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .send({ caption: "unauthorized" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0106: cannot update attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .send({ ...TestData.AttachmentCorrectV4, caption: "unauthorized" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0107: cannot delete attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("Authenticated user access (no special group membership)", () => {
    it("0200: cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0201: cannot validate attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0202: can fetch only public attachments and attachments owned by their group", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(2);
          const [res1, res2] = res.body;
          res1.should.have
            .property("aid")
            .and.be.oneOf([group4AttachmentId, publicAttachmentId]);
          res2.should.have
            .property("aid")
            .and.be.oneOf([group4AttachmentId, publicAttachmentId]);
        });
    });

    it("0203: can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(publicAttachmentId);
        });
    });

    it("0204: can fetch own attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(group4AttachmentId);
        });
    });

    it("0205: cannot fetch foreign attachment by id", async () => {
      return request(appUrl)
        .get(
          `/api/v4/attachments/${encodeURIComponent(archiveManagerAttachmentId)}`,
        )
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0206: cannot update attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .send({ caption: "unauthorized" })
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0207: cannot update attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .send({ ...TestData.AttachmentCorrectV4, caption: "unauthorized" })
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0208: cannot delete attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .auth(accessTokenUser4, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("ATTACHMENT_GROUPS user access", () => {
    let newAttachmentId = null;

    it("0300: can create attachment for own ownerGroup with owned relationships", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user1.role,
          relationships: group1Relationships,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.be.a("string");
          res.body.should.have
            .property("ownerGroup")
            .and.equal(TestData.Accounts.user1.role);
          res.body.should.have
            .property("relationships")
            .and.deep.equal(group1Relationships);
          newAttachmentId = res.body.aid;
        });
    });

    it("0301: cannot create attachment for own ownerGroup with foreign relationships", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user1.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0302: cannot create attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group1Relationships,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0303: can validate attachment for own ownerGroup with own relationships", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user1.role,
          relationships: group1Relationships,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0304: cannot validate attachment for own ownerGroup with foreign relationships", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user1.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0305: cannot validate attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0306: can fetch only public attachments and attachments owned by their group", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(2);
          const [res1, res2] = res.body;
          res1.should.have
            .property("aid")
            .and.be.oneOf([newAttachmentId, publicAttachmentId]);
          res2.should.have
            .property("aid")
            .and.be.oneOf([newAttachmentId, publicAttachmentId]);
        });
    });

    it("0307: can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(publicAttachmentId);
        });
    });

    it("0308: can fetch own attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(newAttachmentId);
        });
    });

    it("0309: cannot fetch foreign attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0310: can update own attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .send({ caption: "patched by user1" })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("patched by user1");
        });
    });

    it("0311: cannot update foreign attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .send({ caption: "patched by user1" })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0312: can update own attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .send({ ...TestData.AttachmentCorrectV4, caption: "updated by user1" })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("updated by user1");
        });
    });

    it("0313: cannot update foreign attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .send({ ...TestData.AttachmentCorrectV4, caption: "updated by user1" })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0314: can delete own attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });

    it("0315: cannot delete foreign attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("ATTACHMENT_PRIVILEGED_GROUPS user access", () => {
    let newAttachmentId = null;
    let crossGroupAttachmentId = null;

    after(async () => {
      await request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });

    it("0400: can create attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user3.role,
          relationships: group3Relationships,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.be.a("string");
          res.body.should.have
            .property("ownerGroup")
            .and.equal(TestData.Accounts.user3.role);
          res.body.should.have
            .property("relationships")
            .and.deep.equal(group3Relationships);
          newAttachmentId = res.body.aid;
        });
    });

    it("0401: can create attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.be.a("string");
          res.body.should.have
            .property("ownerGroup")
            .and.equal(TestData.Accounts.user4.role);
          res.body.should.have
            .property("relationships")
            .and.deep.equal(group4Relationships);
          crossGroupAttachmentId = res.body.aid;
        });
    });

    it("0402: can validate attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user3.role,
          relationships: group3Relationships,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0403: can validate attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0404: can fetch only public attachments and attachments owned by their group", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(2);
          const [res1, res2] = res.body;
          res1.should.have
            .property("aid")
            .and.be.oneOf([newAttachmentId, publicAttachmentId]);
          res2.should.have
            .property("aid")
            .and.be.oneOf([newAttachmentId, publicAttachmentId]);
        });
    });

    it("0405: can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(publicAttachmentId);
        });
    });

    it("0406: can fetch own attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(newAttachmentId);
        });
    });

    it("0407: cannot fetch foreign attachment by id", async () => {
      return request(appUrl)
        .get(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0408: can update own attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .send({ caption: "patched by user3" })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("patched by user3");
        });
    });

    it("0409: cannot update foreign attachment with PATCH", async () => {
      return request(appUrl)
        .patch(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .send({ caption: "patched by user3" })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0410: can update own attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user3.role,
          relationships: group3Relationships,
          caption: "updated by user3",
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("updated by user3");
        });
    });

    it("0411: cannot update foreign attachment with PUT", async () => {
      return request(appUrl)
        .put(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
          caption: "updated by user3",
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0412: can delete own attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });

    it("0413: cannot delete foreign attachment", async () => {
      return request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("ADMIN_GROUPS user access", () => {
    let newAttachmentId = null;
    let crossGroupAttachmentId = null;

    it("0500: can create attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.adminIngestor.role,
          relationships: adminIngestorRelationships,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.be.a("string");
          res.body.should.have
            .property("ownerGroup")
            .and.equal(TestData.Accounts.adminIngestor.role);
          res.body.should.have
            .property("relationships")
            .and.deep.equal(adminIngestorRelationships);
          newAttachmentId = res.body.aid;
        });
    });

    it("0501: can create attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.be.a("string");
          res.body.should.have
            .property("ownerGroup")
            .and.equal(TestData.Accounts.user4.role);
          res.body.should.have
            .property("relationships")
            .and.deep.equal(group4Relationships);
          crossGroupAttachmentId = res.body.aid;
        });
    });

    it("0502: can validate attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.adminIngestor.role,
          relationships: adminIngestorRelationships,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0503: can validate attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0504: can fetch all attachments", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(6);
          res.body.forEach((item) => {
            item.should.have
              .property("aid")
              .and.be.oneOf([
                newAttachmentId,
                crossGroupAttachmentId,
                group4AttachmentId,
                archiveManagerAttachmentId,
                publicAttachmentId,
              ]);
          });
        });
    });

    it("0505: can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(publicAttachmentId);
        });
    });

    it("0506: can fetch own attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(newAttachmentId);
        });
    });

    it("0507: can fetch foreign attachment by id", async () => {
      return request(appUrl)
        .get(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("aid")
            .and.equal(crossGroupAttachmentId);
        });
    });

    it("0508: can update own attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .send({ caption: "patched by adminIngestor" })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("patched by adminIngestor");
        });
    });

    it("0509: can update foreign attachment with PATCH", async () => {
      return request(appUrl)
        .patch(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .send({ caption: "patched by adminIngestor" })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("patched by adminIngestor");
        });
    });

    it("0510: can update own attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.adminIngestor.role,
          relationships: adminIngestorRelationships,
          caption: "updated by adminIngestor",
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("updated by adminIngestor");
        });
    });

    it("0511: can update foreign attachment with PUT", async () => {
      return request(appUrl)
        .put(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.user4.role,
          relationships: group4Relationships,
          caption: "updated by adminIngestor",
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("updated by adminIngestor");
        });
    });

    it("0512: can delete own attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });

    it("0513: can delete foreign attachment", async () => {
      return request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });
  });

  describe("DELETE_GROUPS user access", () => {
    it("0600: cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.archiveManager.role,
          relationships: archiveManagerRelationships,
        })
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0601: cannot validate attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.archiveManager.role,
          relationships: archiveManagerRelationships,
        })
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0602: can fetch only public attachments and attachments owned by their group", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(2);
          const [res1, res2] = res.body;
          res1.should.have
            .property("aid")
            .and.be.oneOf([archiveManagerAttachmentId, publicAttachmentId]);
          res2.should.have
            .property("aid")
            .and.be.oneOf([archiveManagerAttachmentId, publicAttachmentId]);
        });
    });

    it("0603: can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(publicAttachmentId);
        });
    });

    it("0604: can fetch own attachment by id", async () => {
      return request(appUrl)
        .get(
          `/api/v4/attachments/${encodeURIComponent(archiveManagerAttachmentId)}`,
        )
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have
            .property("aid")
            .and.equal(archiveManagerAttachmentId);
        });
    });

    it("0605: cannot fetch foreign attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(group4AttachmentId)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0606: cannot update attachment with PATCH", async () => {
      return request(appUrl)
        .patch(
          `/api/v4/attachments/${encodeURIComponent(archiveManagerAttachmentId)}`,
        )
        .send({ caption: "unauthorized" })
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0607: cannot update attachment with PUT", async () => {
      return request(appUrl)
        .put(
          `/api/v4/attachments/${encodeURIComponent(archiveManagerAttachmentId)}`,
        )
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts.archiveManager.role,
          relationships: archiveManagerRelationships,
          caption: "unauthorized",
        })
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0608: can delete own attachment", async () => {
      return request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(archiveManagerAttachmentId)}`,
        )
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });

    it("0609: can delete foreign attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });
  });
});
