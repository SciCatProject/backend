"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdminIngestor = null;
let accessTokenUser1 = null;
let datasetIdPrivate = null;
let datasetIdUser1 = null;

describe("MetadataKeys v4 ACL", () => {
  before(async () => {
    db.collection("MetadataKeys").deleteMany({});

    accessTokenAdminIngestor = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
  });

  it("0000: create a private dataset v3 has scientific metadata for admin", async () => {
    return request(appUrl)
      .post("/api/v3/Datasets")
      .send(TestData.RawCorrectRandom)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect("Content-Type", /json/)
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        res.body.should.have
          .property("datasetName")
          .and.equal(TestData.RawCorrectRandom.datasetName);

        datasetIdPrivate = encodeURIComponent(res.body["pid"]);
      });
  });

  it("0001: create a public dataset v4 has scientific metadata for unauthenticated user", async () => {
    const publicDataset = { ...TestData.RawCorrectV4, isPublished: true };
    return request(appUrl)
      .post("/api/v4/Datasets")
      .send(publicDataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect("Content-Type", /json/)
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        res.body.should.have
          .property("datasetName")
          .and.equal(publicDataset.datasetName);
      });
  });

  it("0002: create a private dataset v4 has scientific metadata for user1", async () => {
    const user1Dataset = { ...TestData.RawCorrectV4, accessGroups: ["group1"] };
    return request(appUrl)
      .post("/api/v4/Datasets")
      .send(user1Dataset)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect("Content-Type", /json/)
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => {
        res.body.should.have
          .property("datasetName")
          .and.equal(user1Dataset.datasetName);

        datasetIdUser1 = encodeURIComponent(res.body["pid"]);
      });
  });

  it("0010: should allow admin to list all metadata keys", async () => {
    const filter = {
      limits: { limit: 10, skip: 0, sort: { createdAt: "desc" } },
    };

    return request(appUrl)
      .get(
        `/api/v4/metadatakeys?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").that.satisfies((arr) => {
          const values = arr.map((item) => item.isPublished);
          return values.includes(true) && values.includes(false);
        });
      });
  });

  it("0020: should allow unauthenticated user to list only published metadata keys", async () => {
    const filter = {
      where: { sourceType: "dataset" },
      limits: { limit: 10, skip: 0, sort: { createdAt: "desc" } },
    };

    return request(appUrl)
      .get(
        `/api/v4/metadatakeys?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").that.satisfies((arr) => {
          return arr.every((item) => item.isPublished === true);
        });
      });
  });

  it("0030: should allow authenticated user to list metadata keys they have access", async () => {
    const filter = { limits: { limit: 1, skip: 0 } };

    return request(appUrl)
      .get(
        `/api/v4/metadatakeys?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").that.satisfies((arr) => {
          return arr.every((item) => {
            return (
              item.isPublished === true || item.userGroups.includes("group1")
            );
          });
        });
      });
  });

  it("0040: should return empty array when user queries keys they don't have access to", async () => {
    const filter = {
      where: { sourceType: "dataset", sourceId: datasetIdPrivate },
      limits: { limit: 10, skip: 0 },
    };

    return request(appUrl)
      .get(
        `/api/v4/metadatakeys?filter=${encodeURIComponent(JSON.stringify(filter))}`,
      )
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length(0);
      });
  });

  it("0040: should return metadatakeys with correct access for user1", async () => {
    const filter = {
      where: { sourceType: "dataset", sourceId: `${datasetIdUser1}` },
      limits: { limit: 10, skip: 0 },
    };

    return request(appUrl)
      .get(`/api/v4/metadatakeys?filter=${JSON.stringify(filter)}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.be.an("array").and.have.length.of.at.least(1);
      });
  });
});
