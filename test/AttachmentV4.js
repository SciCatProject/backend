"use strict";
const assert = require("node:assert");
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null,
  datasetId = null,
  proposalId = null,
  publishedDataId = null,
  sampleId = null,
  privateAttachmentId = null,
  publicAttachmentId = null,
  attachmentCorrect = null;

describe("Attachments v4 endpoint functionality tests", () => {
  before(async () => {
    await db.collection("Attachment").deleteMany({});
    await db.collection("Dataset").deleteMany({});
    await db.collection("Proposal").deleteMany({});
    await db.collection("PublishedData").deleteMany({});
    await db.collection("Sample").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts.adminIngestor.password,
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
      .post("/api/v3/proposals")
      .send({
        ...TestData.ProposalCorrectComplete,
        ownerGroup: TestData.Accounts.user1.role,
      })
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        proposalId = res.body.proposalId;
      });

    await request(appUrl)
      .post("/api/v4/PublishedData")
      .send(TestData.PublishedDataV4)
      .auth(accessTokenAdminIngestor, { type: "bearer" })
      .expect(TestData.EntryCreatedStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        publishedDataId = res.body.doi;
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
          targetId: proposalId,
          targetType: "proposal",
          relationType: "is attached to",
        },
        {
          targetId: publishedDataId,
          targetType: "published_data",
          relationType: "is attached to",
        },
        {
          targetId: sampleId,
          targetType: "sample",
          relationType: "is attached to",
        },
      ],
    };
  });

  describe("Endpoint: POST /api/v4/attachments", () => {
    it("0100: should create a new attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send(attachmentCorrect)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryCreatedStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("aid").and.be.a("string");
          privateAttachmentId = res.body.aid;
        });
    });

    it("0101: should create a new public attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send({
          ...attachmentCorrect,
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

    it("0102: should not create attachment with non-existent relation target", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send(TestData.AttachmentWrongTargetV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0103: should not create attachment with invalid relation target type", async () => {
      return request(appUrl)
        .post("/api/v4/attachments")
        .send(TestData.AttachmentWrongTypeV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.BadRequestStatusCode)
        .expect("Content-Type", /json/);
    });
  });

  describe("Endpoint: POST /api/v4/attachments/isValid", () => {
    it("0200: should validate minimal attachment", async () => {
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

    it("0201: should validate full attachment", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(attachmentCorrect)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.EntryValidStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.have.property("valid").and.equal(true);
        });
    });

    it("0202: should not validate attachment with non-existent relation target and throw", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(TestData.AttachmentWrongTargetV4)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.NotFoundStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0203: should not validate attachment with invalid relation target type", async () => {
      return request(appUrl)
        .post("/api/v4/attachments/isValid")
        .send(TestData.AttachmentWrongTypeV4)
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

  describe("Endpoint: GET /api/v4/attachments", () => {
    it("0300: should fetch all attachments", async () => {
      return request(appUrl)
        .get("/api/v4/attachments")
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(2);
          const [res1, res2] = res.body;
          res1.should.have
            .property("aid")
            .and.be.oneOf([privateAttachmentId, publicAttachmentId]);
          res2.should.have
            .property("aid")
            .and.be.oneOf([privateAttachmentId, publicAttachmentId]);
        });
    });
  });

  describe("Endpoint: GET /api/v4/attachments/public", () => {
    it("0400: should fetch all public attachments", async () => {
      return request(appUrl)
        .get("/api/v4/attachments/public")
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("array");
          res.body.should.have.length(1);
          const [res1] = res.body;
          res1.should.have.property("aid").and.equal(publicAttachmentId);
        });
    });
  });

  describe("Endpoint: GET /api/v4/attachments/:id", () => {
    it("0500: should fetch attachment by id", async () => {
      return request(appUrl)
        .get(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("object");
          res.body.should.have.property("aid").and.equal(privateAttachmentId);
        });
    });
  });

  describe("Endpoint: PATCH /api/v4/attachments/:id", () => {
    after(async () => {
      await request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
        .send(attachmentCorrect)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0600: should update attachment partially", async () => {
      const updatePayload = {
        caption: "Updated caption text",
        thumbnail: "Updated thumbnail URL",
        relationships: [
          {
            targetId: datasetId,
            targetType: "dataset",
            relationType: "is attached to",
          },
        ],
      };

      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
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
        });
    });

    it("0601: should track history changes", async () => {
      return request(appUrl)
        .get("/api/v3/history")
        .query({
          filter: JSON.stringify({
            subsystem: "Attachment",
            documentId: privateAttachmentId,
          }),
        })
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulGetStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.an("object");
          res.body.should.have.property("items").and.be.an("array");
          res.body.items.should.have.length.greaterThan(0);

          const updateHistory = res.body.items.find(
            (h) => h.operation === "update",
          );
          should.exist(updateHistory);

          updateHistory.should.have
            .property("documentId")
            .and.equal(privateAttachmentId);

          updateHistory.should.have.property("before");
          updateHistory.before.should.have
            .property("caption")
            .and.equal(attachmentCorrect.caption);
          updateHistory.before.should.have
            .property("thumbnail")
            .and.equal(attachmentCorrect.thumbnail);
          updateHistory.before.should.have
            .property("relationships")
            .and.deep.equal(attachmentCorrect.relationships);

          updateHistory.should.have.property("after");
          updateHistory.after.should.have
            .property("caption")
            .and.equal("Updated caption text");
          updateHistory.after.should.have
            .property("thumbnail")
            .and.equal("Updated thumbnail URL");
          updateHistory.after.should.have
            .property("relationships")
            .and.deep.equal([
              {
                targetId: datasetId,
                targetType: "dataset",
                relationType: "is attached to",
              },
            ]);
        });
    });

    it("0602: should update attachment partially with nested properties", async () => {
      const updatePayload = {
        relationships: [
          {
            targetId: datasetId,
            targetType: "dataset",
            relationType: "is modified to",
          },
          {
            targetId: sampleId,
            targetType: "sample",
            relationType: "is modified to",
          },
        ],
      };

      return request(appUrl)
        .patch(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
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
              targetId: datasetId,
              targetType: "dataset",
              relationType: "is modified to",
            },
            {
              targetId: sampleId,
              targetType: "sample",
              relationType: "is modified to",
            },
          ]);
        });
    });

    it("0603: should fail one request with HTTP 412 when two requests try to update the same attachment", async () => {
      const res = await request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
        .send(attachmentCorrect)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/);

      const [res1, res2] = await Promise.all([
        request(appUrl)
          .patch(
            `/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`,
          )
          .send({ caption: "Updated caption 1" })
          .set("if-unmodified-since", res.body.updatedAt)
          .auth(accessTokenAdminIngestor, { type: "bearer" }),
        request(appUrl)
          .patch(
            `/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`,
          )
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

  describe("Endpoint: PUT /api/v4/attachments/:id", () => {
    after(async () => {
      await request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
        .send(attachmentCorrect)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/);
    });

    it("0700: should replace attachment", async () => {
      const updatePayload = {
        ...attachmentCorrect,
        caption: "Updated caption text updated",
      };

      return request(appUrl)
        .put(`/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`)
        .send(updatePayload)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulPatchStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.caption.should.equal(updatePayload.caption);
        });
    });
  });

  describe("Endpoint: DELETE /api/v4/attachments/:id", () => {
    it("0800: should delete private attachment", async () => {
      return request(appUrl)
        .delete(
          `/api/v4/attachments/${encodeURIComponent(privateAttachmentId)}`,
        )
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid");
        });
    });

    it("0801: should delete public attachment", async () => {
      return request(appUrl)
        .delete(`/api/v4/attachments/${encodeURIComponent(publicAttachmentId)}`)
        .auth(accessTokenAdminIngestor, { type: "bearer" })
        .expect(TestData.SuccessfulDeleteStatusCode)
        .expect("Content-Type", /json/)
        .then((res) => {
          res.body.should.be.a("object");
          res.body.should.have.property("aid");
        });
    });
  });
});
