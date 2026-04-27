"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
  accessTokenUser2 = null,
  accessTokenUser3 = null,
  accessTokenArchiveManager = null,
  createdAttachmentId = null;

describe("Attachments v4 tests", () => {
  before(async () => {
    db.collection("Attachment").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"].password,
    });
    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"].password,
    });
    accessTokenUser2 = await utils.getToken(appUrl, {
      username: "user2",
      password: TestData.Accounts["user2"].password,
    });
    accessTokenUser3 = await utils.getToken(appUrl, {
      username: "user3",
      password: TestData.Accounts["user3"].password,
    });
    accessTokenArchiveManager = await utils.getToken(appUrl, {
      username: "archiveManager",
      password: TestData.Accounts["archiveManager"].password,
    });
  });

  describe("Validation tests", () => {
    it("0100: should not be able to validate attachment if not logged in", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(TestData.AttachmentCorrectMinV4)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0105: check if minimal attachment is valid", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(TestData.AttachmentCorrectMinV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("0110: check if custom attachment is valid", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(TestData.AttachmentCorrectV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("0115: check if invalid attachment is valid", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(TestData.AttachmentWrongV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(false);
          res.body.should.have
            .property("reason")
            .and.have.length.greaterThan(0);
        });
    });
  });

  describe("Admin user CRUD tests (adminIngestor in ADMIN_GROUPS)", () => {
    it("0200: should create a new attachment", async () => {
      const attachment = {
        ...TestData.AttachmentCorrectV4,
        aid: uuidv4(),
      };

      return request(appUrl)
        .post("/api/v4/attachments")
        .send(attachment)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid").and.be.a("string");
          createdAttachmentId = res.body.aid;
        });
    });

    it("0300: should fetch all attachments", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0305: should fetch attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(createdAttachmentId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.aid.should.equal(createdAttachmentId);
        });
    });

    it("0400: should update attachment with PUT endpoint", async () => {
      const updatePayload = {
        ...TestData.AttachmentCorrectV4,
        caption: "Updated caption text updated",
      };

      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(createdAttachmentId)}`)
        .send(updatePayload)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.caption.should.equal(updatePayload.caption);
        });
    });

    it("0405: should update attachment partially with PATCH endpoint", async () => {
      const updatePayload = {
        caption: "Updated caption text",
        thumbnail: "Updated thumbnail URL",
        relationships: [
          {
            targetId: "testId1-modified",
            targetType: "dataset",
            relationType: "is attached to",
          },
          {
            targetId: "testId2-modified",
            targetType: "sample",
            relationType: "is attached to",
          },
        ],
      };

      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(createdAttachmentId)}`)
        .send(updatePayload)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.caption.should.equal(updatePayload.caption);
          res.body.thumbnail.should.equal(updatePayload.thumbnail);
          res.body.relationships[0].targetId.should.equal(
            updatePayload.relationships[0].targetId,
          );
          res.body.relationships[1].targetId.should.equal(
            updatePayload.relationships[1].targetId,
          );
        });
    });

    it("0410: should update attachment partially with nested properties with PATCH endpoint", async () => {
      const updatePayload = {
        relationships: [
          {
            targetId: "testId1-modified-twice",
            targetType: "sample",
          },
          {
            targetId: "testId2-modified-twice",
            targetType: "sample",
          },
        ],
      };

      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(createdAttachmentId)}`)
        .set("Content-type", "application/merge-patch+json")
        .send(updatePayload)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.caption.should.equal("Updated caption text");
          res.body.thumbnail.should.equal("Updated thumbnail URL");
          res.body.relationships.should.deep.equal([
            {
              targetId: "testId1-modified-twice",
              targetType: "sample",
              relationType: "is attached to",
            },
            {
              targetId: "testId2-modified-twice",
              targetType: "sample",
              relationType: "is attached to",
            },
          ]);
        });
    });

    it("0500: should delete attachment", async () => {
      return request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(createdAttachmentId)}`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid");
        });
    });
  });

  describe("Unauthenticated access tests (no token)", () => {
    let publicAttachmentId = null;
    let privateAttachmentId = null;
    const publicAttachment = {
      ...TestData.AttachmentCorrectV4,
    };
    const privateAttachment = {
      ...TestData.AttachmentCorrectV4,
      isPublished: false,
    };

    before(async () => {
      // public attachment (isPublished: true)
      const pubRes = await request(appUrl)
        .post("/api/v4/attachments")
        .send({ ...publicAttachment, aid: uuidv4() })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      publicAttachmentId = pubRes.body.aid;

      // private attachment (isPublished: false)
      const privateRes = await request(appUrl)
        .post("/api/v4/attachments")
        .send({ ...privateAttachment, aid: uuidv4() })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      privateAttachmentId = privateRes.body.aid;
    });

    after(async () => {
      if (publicAttachmentId) {
        await request(appUrl)
          .delete(
            `/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`,
          )
          .auth(accessTokenAdminIngestor, { type: "bearer" });
      }
      if (privateAttachmentId) {
        await request(appUrl)
          .delete(
            `/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`,
          )
          .auth(accessTokenAdminIngestor, { type: "bearer" });
      }
    });

    it("0600: unauthenticated user cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({ ...publicAttachment, aid: uuidv4() })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0605: unauthenticated user can fetch only public attachments", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.length.should.be.greaterThan(0);
          res.body.forEach((item) => {
            item.isPublished.should.equal(
              true,
              `Attachment ${item.aid} is not published but was returned in the list of attachments for unauthenticated user`,
            );
          });
        });
    });

    it("0610: unauthenticated user can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.aid.should.equal(publicAttachmentId);
        });
    });

    it("0611: unauthenticated user cannot fetch private attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0615: unauthenticated user cannot update public attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .send({ ...publicAttachment, caption: "unauthorized" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0615: unauthenticated user cannot update private attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
        .send({ ...privateAttachment, caption: "unauthorized" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0620: unauthenticated user cannot update public attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .send({ ...publicAttachment, caption: "unauthorized" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0621: unauthenticated user cannot update private attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
        .send({ ...privateAttachment, caption: "unauthorized" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0625: unauthenticated user cannot delete public attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0626: unauthenticated user cannot delete private attachment", async () => {
      return request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`,
        )
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("Unprivileged authenticated user access tests (user2 - group2, not in ATTACHMENT_GROUPS or ATTACHMENT_PRIVILEGED_GROUPS)", () => {
    let publicAttachmentId = null;
    let ownGroupAttachmentId = null;
    let otherPrivateAttachmentId = null;

    before(async () => {
      // public attachment (isPublished: true, ownerGroup not user2's)
      const pubRes = await request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          isPublished: true,
          ownerGroup: "ess",
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      publicAttachmentId = pubRes.body.aid;

      // private attachment owned by user2's group
      const ownRes = await request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          isPublished: false,
          ownerGroup: TestData.Accounts["user2"].role,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      ownGroupAttachmentId = ownRes.body.aid;

      // private attachment owned by a different group (not user2's)
      const otherRes = await request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          isPublished: false,
          ownerGroup: TestData.Accounts["user1"].role,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      otherPrivateAttachmentId = otherRes.body.aid;
    });

    after(async () => {
      for (const id of [
        publicAttachmentId,
        ownGroupAttachmentId,
        otherPrivateAttachmentId,
      ]) {
        if (id) {
          await request(appUrl)
            .delete(`/api/v4/attachments/${encodeURIComponent(id)}`)
            .auth(accessTokenAdminIngestor, { type: "bearer" });
        }
      }
    });

    it("0700: user2 (group2) cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({ ...TestData.AttachmentCorrectV4, aid: uuidv4() })
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0705: user2 (group2) can fetch only public attachments and attachments belonging to their group", async () => {
      const user2Group = TestData.Accounts["user2"].role;
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.forEach((item) => {
            const canSee =
              item.isPublished === true ||
              item.ownerGroup === user2Group ||
              item.accessGroups.includes(user2Group);
            canSee.should.equal(
              true,
              `Attachment ${item.aid} was returned, but it should not be visible to user2`,
            );
          });
          const aids = res.body.map((item) => item.aid);
          aids.should.include(publicAttachmentId);
          aids.should.include(ownGroupAttachmentId);
          aids.should.not.include(otherPrivateAttachmentId);
        });
    });

    it("0710: user2 (group2) can fetch public attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.aid.should.equal(publicAttachmentId);
        });
    });

    it("0715: user2 (group2) cannot update attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .send({ ...TestData.AttachmentCorrectV4, caption: "unauthorized" })
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0720: user2 (group2) cannot update attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .send({ caption: "unauthorized" })
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0725: user2 (group2) cannot delete attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenUser2, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("ATTACHMENT_GROUPS user access tests (user1 - group1, in ATTACHMENT_GROUPS)", () => {
    let attachmentId = null;
    let otherPrivateAttachmentId = null;

    before(async () => {
      // private attachment owned by a different group (not user2's)
      const otherRes = await request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          isPublished: false,
          ownerGroup: "notGroup1",
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      otherPrivateAttachmentId = otherRes.body.aid;
    });

    after(async () => {
      if (otherPrivateAttachmentId) {
        await request(appUrl)
          .delete(
            `/api/v4/attachments/${encodeURIComponent(otherPrivateAttachmentId)}`,
          )
          .auth(accessTokenAdminIngestor, { type: "bearer" });
      }
    });

    it("0800: user1 (group1/ATTACHMENT_GROUPS) can create attachment with ownerGroup in their groups", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          ownerGroup: TestData.Accounts["user1"].role,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid").and.be.a("string");
          res.body.ownerGroup.should.equal(TestData.Accounts["user1"].role);
          attachmentId = res.body.aid;
        });
    });

    it("0801: user1 (group1/ATTACHMENT_GROUPS) cannot create attachment with ownerGroup outside their groups", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          ownerGroup: TestData.Accounts["user3"].role,
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0805: user1 (group1/ATTACHMENT_GROUPS) can fetch all attachments", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0810: user1 (group1/ATTACHMENT_GROUPS) can fetch their own attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(attachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.aid.should.equal(attachmentId);
        });
    });

    it("0815: user1 (group1/ATTACHMENT_GROUPS) can update their own attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(attachmentId)}`)
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts["user1"].role,
          caption: "updated by user1",
        })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.caption.should.equal("updated by user1");
        });
    });

    it("0820: user1 (group1/ATTACHMENT_GROUPS) can update their own attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(attachmentId)}`)
        .send({ caption: "patched by user1" })
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.caption.should.equal("patched by user1");
        });
    });

    it("0825: user1 (group1/ATTACHMENT_GROUPS) can delete their own attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(attachmentId)}`)
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });

    it("0830: user1 (group1/ATTACHMENT_GROUPS) cannot delete another user's attachment", async () => {
      return request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(otherPrivateAttachmentId)}`,
        )
        .auth(accessTokenUser1, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("ATTACHMENT_PRIVILEGED_GROUPS user access tests (user3 - group3, in ATTACHMENT_PRIVILEGED_GROUPS)", () => {
    let attachmentId = null;
    let crossGroupAttachmentId = null;

    after("cleanup cross-group attachment created by user3", async () => {
      if (crossGroupAttachmentId) {
        await request(appUrl)
          .delete(
            `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
          )
          .auth(accessTokenAdminIngestor, { type: "bearer" });
      }
    });

    it("0900: user3 (group3/ATTACHMENT_PRIVILEGED_GROUPS) can create attachment with their own ownerGroup", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          ownerGroup: TestData.Accounts["user3"].role,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid").and.be.a("string");
          res.body.ownerGroup.should.equal(TestData.Accounts["user3"].role);
          attachmentId = res.body.aid;
        });
    });

    it("0901: user3 (group3/ATTACHMENT_PRIVILEGED_GROUPS) can create attachment for another group (cross-group privilege)", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          ownerGroup: TestData.Accounts["user1"].role,
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid").and.be.a("string");
          res.body.ownerGroup.should.equal(TestData.Accounts["user1"].role);
          crossGroupAttachmentId = res.body.aid;
        });
    });

    it("0905: user3 (group3/ATTACHMENT_PRIVILEGED_GROUPS) can fetch all attachments", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0910: user3 (group3/ATTACHMENT_PRIVILEGED_GROUPS) can fetch their own attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(attachmentId)}`)
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.aid.should.equal(attachmentId);
        });
    });

    it("0915: user3 (group3/ATTACHMENT_PRIVILEGED_GROUPS) can update their own attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(attachmentId)}`)
        .send({
          ...TestData.AttachmentCorrectV4,
          ownerGroup: TestData.Accounts["user3"].role,
          caption: "updated by user3",
        })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.caption.should.equal("updated by user3");
        });
    });

    it("0920: user3 (group3/ATTACHMENT_PRIVILEGED_GROUPS) can update their own attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(attachmentId)}`)
        .send({ caption: "patched by user3" })
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.caption.should.equal("patched by user3");
        });
    });

    it("0925: user3 (group3/ATTACHMENT_PRIVILEGED_GROUPS) can delete their own attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(attachmentId)}`)
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
        });
    });

    it("0930: user3 (group3/ATTACHMENT_PRIVILEGED_GROUPS) cannot delete cross-group attachment", async () => {
      return request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(crossGroupAttachmentId)}`,
        )
        .auth(accessTokenUser3, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("DELETE_GROUPS user access tests (archiveManager - in DELETE_GROUPS but not ATTACHMENT_GROUPS)", () => {
    let publicAttachmentId = null;

    before(async () => {
      const res = await request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...TestData.AttachmentCorrectV4,
          aid: uuidv4(),
          isPublished: false,
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      publicAttachmentId = res.body.aid;
    });

    it("0950: archiveManager (DELETE_GROUPS) cannot create attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({ ...TestData.AttachmentCorrectV4, aid: uuidv4() })
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0965: archiveManager (DELETE_GROUPS) cannot update attachment with PUT", async () => {
      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .send({ ...TestData.AttachmentCorrectV4, caption: "unauthorized" })
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0970: archiveManager (DELETE_GROUPS) cannot update attachment with PATCH", async () => {
      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .send({ caption: "unauthorized" })
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.AccessForbiddenStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0975: archiveManager (DELETE_GROUPS) can delete attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenArchiveManager, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid");
          publicAttachmentId = null;
        });
    });
  });

  describe("History tracking tests", () => {
    let historyAttachmentId = null;

    /**
     * Test 1000: Creates a minimal attachment with original values
     * Sets initial caption to "Minimal attachment for history tracking"
     * Sets initial thumbnail to "data/abc123"
     * Stores the attachment ID for subsequent tests
     */
    it("1000: should create attachment with minimal data", async () => {
      const minimalAttachment = {
        ...TestData.AttachmentCorrectMinV4,
        aid: uuidv4(),
        caption: "Minimal attachment for history tracking",
        thumbnail: "data/abc123",
      };

      return request(appUrl)
        .post("/api/v4/attachments")
        .send(minimalAttachment)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid").and.be.a("string");
          historyAttachmentId = res.body.aid;
        });
    });

    /**
     * Test 1010: Updates the attachment with new values
     * Changes caption to "my caption"
     * Changes thumbnail to "data/abc321"
     */
    it("1010: should update attachment with new caption and thumbnail", async () => {
      const updatePayload = {
        caption: "my caption",
        thumbnail: "data/abc321",
      };

      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(historyAttachmentId)}`)
        .send(updatePayload)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          // Verify the attachment was updated correctly
          res.body.caption.should.equal(updatePayload.caption);
          res.body.thumbnail.should.equal(updatePayload.thumbnail);
        });
    });

    /**
     * Test 1020: Verifies the update was successful
     * Fetches the attachment and checks the values were updated
     */
    it("1020: should verify attachment was updated correctly", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(historyAttachmentId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.caption.should.equal("my caption");
          res.body.thumbnail.should.equal("data/abc321");
        });
    });

    /**
     * Test 1030: Verifies history tracking worked properly
     * Queries the history API for this attachment ID
     * Checks that history contains the update operation
     * Verifies the "before" values match the original values
     * Verifies the "after" values match the updated values
     */
    it("1030: should verify history contains the before and after values", async () => {
      // First get the history data for this attachment
      return request(appUrl)
        .get(`/api/v3/history`)
        .query({
          filter: JSON.stringify({
            subsystem: "Attachment",
            documentId: historyAttachmentId,
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          // History should be an object with items array
          res.body.should.be.an("object");
          res.body.should.have.property("items").that.is.an("array");
          res.body.items.should.have.length.greaterThan(0);

          // Find the update operation in the history
          const updateHistory = res.body.items.find(
            (h) => h.operation === "update",
          );
          should.exist(updateHistory);

          // Verify history contains the document ID
          updateHistory.should.have
            .property("documentId")
            .equal(historyAttachmentId);

          // Verify the history contains the before and after values
          updateHistory.should.have.property("before");
          updateHistory.should.have.property("after");

          // Before should have the original values
          updateHistory.before.should.have
            .property("caption")
            .equal("Minimal attachment for history tracking");
          updateHistory.before.should.have
            .property("thumbnail")
            .equal("data/abc123");

          // After should have the updated values
          updateHistory.after.should.have
            .property("caption")
            .equal("my caption");
          updateHistory.after.should.have
            .property("thumbnail")
            .equal("data/abc321");
        });
    });

    /**
     * After Hook 1040: Cleans up by deleting the test attachment
     */
    after("1040: cleanup - delete the test attachment", async () => {
      if (historyAttachmentId) {
        return request(appUrl)
          .delete(
            `/api/v4/attachments/${encodeURIComponent(historyAttachmentId)}`,
          )
          .auth(accessTokenAdminIngestor, { type: "bearer" })
          .expect(TestData.SuccessfulDeleteStatusCode);
      }
    });
  });
});
