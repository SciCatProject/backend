"use strict";
const utils = require("./LoginUtils");
const { TestData } = require("./TestData");

let accessTokenAdmin = null;
let accessTokenUser1 = null;

describe("RuntimeConfig ACL", () => {
  const cid = "frontendConfig";

  before(async () => {
    accessTokenAdmin = await utils.getToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });

    accessTokenUser1 = await utils.getToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
  });

  it("should allow any user to fetch config", async () => {
    return request(appUrl)
      .get(`/api/v3/runtime-config/${encodeURIComponent(cid)}`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulGetStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("cid").and.be.equal(cid);
        res.body.should.have.property("data");
      });
  });

  it("should forbid non-admin user to update config", async () => {
    return request(appUrl)
      .put(`/api/v3/runtime-config/${encodeURIComponent(cid)}`)
      .send({ data: { test: true } })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("should allow admin to update config", async () => {
    return request(appUrl)
      .put(`/api/v3/runtime-config/${encodeURIComponent(cid)}`)
      .send({ data: { test: true } })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdmin}` })
      .expect(TestData.SuccessfulPatchStatusCode);
  });
});
