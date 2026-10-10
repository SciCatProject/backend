"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  accessTokenUser3 = null,
  accessTokenArchiveManager = null,
  datasetId = null,
  sampleId = null,
  group1AttachmentId = null,
  group2AttachmentId = null,
  archiveManagerAttachmentId = null,
  publicAttachmentId = null,
  attachmentCorrect = null;

describe("Attachments v4 access tests", () => {
  before(async () => {
    db.collection("Attachment").deleteMany({});
    db.collection("Dataset").deleteMany({});
    db.collection("Sample").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts.adminIngestor.password,
    });
    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts.user1.password,
    });
    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts.user2.password,
    });
    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts.user3.password,
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
        datasetId = res.body.pid;
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

    attachmentCorrect = {
      ...TestData.AttachmentCorrectV4,
      relationships: [
        {
          targetId: datasetId,
          targetType: "dataset",
          relationType: "is attached to",
        },
        {
          targetId: sampleId,
          targetType: "sample",
          relationType: "is attached to",
        },
      ],
    };

    await request(appUrl)
      .post("/api/v4/attachments")
      .send({
        ...attachmentCorrect,
        ownerGroup: TestData.Accounts.user1.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("aid").and.be.a("string");
        group1AttachmentId = res.body.aid;
      });

    await request(appUrl)
      .post("/api/v4/attachments")
      .send({
        ...attachmentCorrect,
        ownerGroup: TestData.Accounts.user2.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("aid").and.be.a("string");
        group2AttachmentId = res.body.aid;
      });

    await request(appUrl)
      .post("/api/v4/attachments")
      .send({
        ...attachmentCorrect,
        ownerGroup: TestData.Accounts.archiveManager.role,
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
        ...attachmentCorrect,
        ownerGroup: TestData.Accounts.user4.role,
        isPublished: true,
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
    it("0100: cannot validate attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(attachmentCorrect)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0101: cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send(attachmentCorrect)
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
          res2.should.have.property("isPublished").and.equal(true);
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
        .get(`/api/v4/attachments/${encodeURIComponent(group1AttachmentId)}`)
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
        .send({ ...attachmentCorrect, caption: "unauthorized" })
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
    it("0200: cannot validate attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(attachmentCorrect)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0201: cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send(attachmentCorrect)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0202: can fetch only public attachments and attachments owned by their group", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(2);
          const [res1, res2] = res.body;
          res1.should.have
            .property("aid")
            .and.be.oneOf([group2AttachmentId, publicAttachmentId]);
          res2.should.have
            .property("aid")
            .and.be.oneOf([group2AttachmentId, publicAttachmentId]);
        });
    });

    it("0203: can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(publicAttachmentId);
        });
    });

    it("0204: can fetch own attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(group2AttachmentId)}`)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(group2AttachmentId);
        });
    });

    it("0205: cannot fetch foreign attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(group1AttachmentId)}`)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0206: cannot update attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(group2AttachmentId)}`)
        .send({ caption: "unauthorized" })
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0207: cannot update attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(group2AttachmentId)}`)
        .send({ ...attachmentCorrect, caption: "unauthorized" })
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0208: cannot delete attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(group2AttachmentId)}`)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("ATTACHMENT_GROUPS user access", () => {
    let newAttachmentId = null;

    it("0300: can validate attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user1.role,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0301: cannot validate attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user2.role,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0302: can create attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user1.role,
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
          newAttachmentId = res.body.aid;
        });
    });

    it("0303: cannot create attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user2.role,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0304: can fetch only public attachments and attachments owned by their group", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(3);
          const [res1, res2, res3] = res.body;
          res1.should.have
            .property("aid")
            .and.be.oneOf([
              newAttachmentId,
              group1AttachmentId,
              publicAttachmentId,
            ]);
          res2.should.have
            .property("aid")
            .and.be.oneOf([
              newAttachmentId,
              group1AttachmentId,
              publicAttachmentId,
            ]);
          res3.should.have
            .property("aid")
            .and.be.oneOf([
              newAttachmentId,
              group1AttachmentId,
              publicAttachmentId,
            ]);
        });
    });

    it("0305: can fetch public attachment by id", async () => {
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

    it("0306: can fetch own attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(group1AttachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.equal(group1AttachmentId);
        });
    });

    it("0307: cannot fetch foreign attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(group2AttachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0308: can update own attachment with PATCH", async () => {
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

    it("0309: cannot update foreign attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(group2AttachmentId)}`)
        .send({ caption: "patched by user1" })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0310: can update own attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .send({ ...attachmentCorrect, caption: "updated by user1" })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have
            .property("caption")
            .and.equal("updated by user1");
        });
    });

    it("0311: cannot update foreign attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(group2AttachmentId)}`)
        .send({ ...attachmentCorrect, caption: "updated by user1" })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0312: can delete own attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(newAttachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });

    it("0313: cannot delete foreign attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(group2AttachmentId)}`)
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

    it("0400: can validate attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user3.role,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0401: can validate attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user2.role,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0402: can create attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user3.role,
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
          newAttachmentId = res.body.aid;
        });
    });

    it("0403: can create attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user2.role,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.be.a("string");
          res.body.should.have
            .property("ownerGroup")
            .and.equal(TestData.Accounts.user2.role);
          crossGroupAttachmentId = res.body.aid;
        });
    });

    it("0404: can fetch only public attachments and attachments owned by their group", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(3);
          const [res1, res2, res3] = res.body;
          res1.should.have
            .property("aid")
            .and.be.oneOf([
              newAttachmentId,
              group1AttachmentId,
              publicAttachmentId,
            ]);
          res2.should.have
            .property("aid")
            .and.be.oneOf([
              newAttachmentId,
              group1AttachmentId,
              publicAttachmentId,
            ]);
          res3.should.have
            .property("aid")
            .and.be.oneOf([
              newAttachmentId,
              group1AttachmentId,
              publicAttachmentId,
            ]);
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
        .send({ ...attachmentCorrect, caption: "updated by user3" })
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
        .send({ ...attachmentCorrect, caption: "updated by user3" })
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

    it("0500: can validate attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.adminIngestor.role,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0501: can validate attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user2.role,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0502: can create attachment for own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.adminIngestor.role,
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
          newAttachmentId = res.body.aid;
        });
    });

    it("0503: can create attachment for foreign ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...attachmentCorrect,
          ownerGroup: TestData.Accounts.user2.role,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.be.a("string");
          res.body.should.have
            .property("ownerGroup")
            .and.equal(TestData.Accounts.user2.role);
          crossGroupAttachmentId = res.body.aid;
        });
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
                group1AttachmentId,
                group2AttachmentId,
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
        .send({ ...attachmentCorrect, caption: "updated by adminIngestor" })
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
        .send({ ...attachmentCorrect, caption: "updated by adminIngestor" })
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
    it("0600: cannot validate attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(attachmentCorrect)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0601: cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send(attachmentCorrect)
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
        .get(`/api/v4/attachments/${encodeURIComponent(group1AttachmentId)}`)
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
        .send({ ...attachmentCorrect, caption: "unauthorized" })
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
