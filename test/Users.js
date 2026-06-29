"use strict";
const { TestData } = require("./TestData");
const utils = require("./LoginUtils");

let accessTokenAdminIngestor = null,
  userIdUser1 = null,
  accessTokenUser1 = null,
  userIdUser2 = null,
  accessTokenUser2 = null,
  adminIngestorUserId = null;

describe("2350: Users: Login with functional accounts", () => {
  it("0010: Admin ingestor login fails with incorrect credentials", async () => {
    return request(appUrl)
      .post("/api/v3/auth/Login?include=user")
      .send({
        username: "adminIngestor",
        password: TestData.Accounts["user1"]["password"],
      })
      .set("Accept", "application/json")
      .then((res) => {
        res.should.have.property("error");
      });
  });

  it("0020: Login should succeed with correct credentials", async () => {
    return request(appUrl)
      .post("/api/v3/auth/Login?include=user")
      .send({
        username: "adminIngestor",
        password: TestData.Accounts["adminIngestor"]["password"],
      })
      .set("Accept", "application/json")
      .expect(TestData.LoginSuccessfulStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("user").and.be.instanceof(Object);
        adminIngestorUserId = res.body.userId;
      });
  });
});

describe("2360: Users settings", () => {
  beforeEach(async () => {
    const loginResponseUser1 = await utils.getIdAndToken(appUrl, {
      username: "user1",
      password: TestData.Accounts["user1"]["password"],
    });
    userIdUser1 = loginResponseUser1.userId;
    accessTokenUser1 = loginResponseUser1.token;
  });

  it("0010: Update users settings with valid value should success ", async () => {
    return request(appUrl)
      .put(`/api/v3/Users/${userIdUser1}/settings`)
      .send(TestData.userSettingsCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("userId", userIdUser1);
        res.body.should.have.property("datasetCount");
        res.body.should.have.property("jobCount");
        res.body.should.have.property("externalSettings");
      });
  });

  it("0020: Patch users settings with valid value should success ", async () => {
    return request(appUrl)
      .patch(`/api/v3/Users/${userIdUser1}/settings`)
      .send(TestData.userSettingsCorrect)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("userId", userIdUser1);
        res.body.should.have.property("datasetCount");
        res.body.should.have.property("jobCount");
        res.body.should.have.property("externalSettings");
      });
  });

  it("0030: Patch users external settings with valid value should success ", async () => {
    return request(appUrl)
      .patch(`/api/v3/Users/${userIdUser1}/settings/external`)
      .send(TestData.userSettingsCorrect.externalSettings)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .expect("Content-Type", /json/)
      .then((res) => {
        res.body.should.have.property("userId", userIdUser1);
        res.body.should.have.property("datasetCount");
        res.body.should.have.property("jobCount");
        res.body.should.have.property("externalSettings");
      });
  });
});

describe("2370: Change password", () => {
  before(async () => {
    const loginResponseIngestor = await utils.getIdAndToken(appUrl, {
      username: "adminIngestor",
      password: TestData.Accounts["adminIngestor"]["password"],
    });
    accessTokenAdminIngestor = loginResponseIngestor.token;

    const loginResponseUser1 = await utils.getIdAndToken(appUrl, {
      username: TestData.Accounts["user1"]["username"],
      password: TestData.Accounts["user1"]["password"],
    });
    userIdUser1 = loginResponseUser1.userId;
    accessTokenUser1 = loginResponseUser1.token;

    const loginResponseUser2 = await utils.getIdAndToken(appUrl, {
      username: TestData.Accounts["user2"]["username"],
      password: TestData.Accounts["user2"]["password"],
    });
    userIdUser2 = loginResponseUser2.userId;
    accessTokenUser2 = loginResponseUser2.token;

    db.collection("User").updateOne(
      { username: TestData.Accounts["user2"]["username"] },
      { $set: { authStrategy: "oidc" } },
    );
  });

  after(async () => {
    db.collection("User").updateOne(
      { username: TestData.Accounts["user2"]["username"] },
      { $set: { authStrategy: "local" } },
    );
  });

  it("0010: should fail to change password with incorrect password", async () => {
    return request(appUrl)
      .post("/api/v3/users/password")
      .send({
        currentPassword: "wrongOldPassword",
        newPassword: TestData.Accounts["user1"]["password"],
        confirmPassword: TestData.Accounts["user1"]["password"],
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.BadRequestStatusCode)
      .then((res) => {
        res.body.should.have.property(
          "message",
          "Current password is incorrect",
        );
      });
  });

  it("0020: should fail when new password and confirmation password do not match", async () => {
    return request(appUrl)
      .post("/api/v3/users/password")
      .send({
        currentPassword: TestData.Accounts["user1"]["password"],
        newPassword: "testpassword",
        confirmPassword: "wrongConfirmPassword",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.BadRequestStatusCode)
      .then((res) => {
        res.body.should.have.property(
          "message",
          "New password and confirmation password do not match",
        );
      });
  });

  it("0030: should change own password successfully", async () => {
    return request(appUrl)
      .post("/api/v3/users/password")
      .send({
        currentPassword: TestData.Accounts["user1"]["password"],
        newPassword: "testpassword",
        confirmPassword: "testpassword",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .expect(TestData.SuccessfulPostStatusCode)
      .then((res) => {
        res.body.should.have.property(
          "message",
          "Password updated successfully",
        );
      });
  });

  it("0040: oidc user should fail to change password", async () => {
    return request(appUrl)
      .post("/api/v3/users/password")
      .send({
        currentPassword: TestData.Accounts["user2"]["password"],
        newPassword: "testpassword",
        confirmPassword: "testpassword",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenUser2}` })
      .expect(TestData.CreationForbiddenStatusCode)
      .then((res) => {
        res.body.should.have.property(
          "message",
          "Only local users are allowed to change password",
        );
      });
  });

  it("0050: anonymous user should not be able to access admin password change endpoint", async () => {
    return request(appUrl)
      .patch(`/api/v3/users/${adminIngestorUserId}/password`)
      .send({
        newPassword: "compromisedPassword",
        confirmPassword: "compromisedPassword",
      })
      .set("Accept", "application/json")
      .expect(TestData.UnauthorizedStatusCode);
  });

  it("0060: authenticated user should not be able to access admin password change endpoint", async () => {
    return request(appUrl)
      .patch(`/api/v3/users/${adminIngestorUserId}/password`)
      .send({
        newPassword: "compromisedPassword",
        confirmPassword: "compromisedPassword",
      })
      .set({ Authorization: `Bearer ${accessTokenUser1}` })
      .set("Accept", "application/json")
      .expect(TestData.AccessForbiddenStatusCode);
  });

  it("0070: admin should fail to change password for user when new and confirmation passwords do not match", async () => {
    return request(appUrl)
      .patch(`/api/v3/users/${userIdUser1}/password`)
      .send({
        newPassword: TestData.Accounts["user1"]["password"],
        confirmPassword: "wrongConfirmPassword",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.BadRequestStatusCode)
      .then((res) => {
        res.body.should.have.property(
          "message",
          "New password and confirmation password do not match",
        );
      });
  });

  it("0080: admin should be able to change user password", async () => {
    return request(appUrl)
      .patch(`/api/v3/users/${userIdUser1}/password`)
      .send({
        newPassword: TestData.Accounts["user1"]["password"],
        confirmPassword: TestData.Accounts["user1"]["password"],
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.SuccessfulPatchStatusCode)
      .then((res) => {
        res.body.should.have.property(
          "message",
          `Password updated successfully for userId: ${userIdUser1}`,
        );
      });
  });

  it("0090: admin should fail to change oidc user password", async () => {
    return request(appUrl)
      .patch(`/api/v3/users/${userIdUser2}/password`)
      .send({
        newPassword: "testpassword",
        confirmPassword: "testpassword",
      })
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .expect(TestData.CreationForbiddenStatusCode)
      .then((res) => {
        res.body.should.have.property(
          "message",
          "Only local users passwords can be changed by admin",
        );
      });
  });

  it("0100: Request with expired token should return SESSION_EXPIRED", async () => {
    const response = await request(appUrl)
      .post(`/api/v3/users/${adminIngestorUserId}/jwt`)
      .set("Accept", "application/json")
      .set({ Authorization: `Bearer ${accessTokenAdminIngestor}` })
      .send({ expiresIn: "-5" });

    const expiredAccessToken = response.body.jwt;
    return request(appUrl)
      .post("/api/v3/datasets")
      .set("Accept", "application/json")
      .set({
        Authorization: `Bearer ${expiredAccessToken}`,
      })
      .send({})
      .expect(401)
      .then((res) => {
        res.body.message.should.equal("SESSION_EXPIRED");
      });
  });
});
