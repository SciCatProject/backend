"use strict";
const assert = require("node:assert");
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");
const { v4: uuidv4 } = require("uuid");
const request = require("supertest");

let accessTokenAdminIngestor = null,
  accessTokenUser1 = null,
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

  describe("Creation tests", () => {
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
  });

  describe("Read tests", () => {
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
  });

  describe("Update tests", () => {
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
  });

  describe("Delete tests", () => {
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

  describe("Optimistic concurrency control tests", () => {
    it("0510: should fail one request with HTTP 412 when two requests try to update the same attachment", async () => {
      const res = await request(appUrl)
        .post("/api/v4/attachments")
        .send({ ...TestData.AttachmentCorrectV4, aid: uuidv4() })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode);
      const aid = encodeURIComponent(res.body.aid);

      const [res1, res2] = await Promise.all([
        request(appUrl)
          .patch(`/api/v4/attachments/${aid}`)
          .send({ caption: "Updated caption 1" })
          .set("if-unmodified-since", res.body.updatedAt)
          .auth(accessTokenAdminIngestor, { type: "bearer" }),
        request(appUrl)
          .patch(`/api/v4/attachments/${aid}`)
          .send({ caption: "Updated caption 2" })
          .set("if-unmodified-since", res.body.updatedAt)
          .auth(accessTokenAdminIngestor, { type: "bearer" }),
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
