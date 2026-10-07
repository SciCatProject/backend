"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenArchiveManager = null,
  accessTokenAdminIngestor = null,
  id = null;

const testdataset = { ...TestData.PolicyCorrect };

describe("1300: Policy: Simple Policy tests", () => {
  before(async () => {
    db.collection("Policy").deleteMany({});

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
