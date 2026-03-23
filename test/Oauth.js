const { TestData } = require("./TestData");

const isCI = process.env.CI === "true";

describe("OIDC E2E", () => {
  before(function () {
    if (!isCI) this.skip();
  });

  const keycloakUrl = "http://localhost:8080";

  const testUser = {
    username: "test-username",
    password: "test-password",
    email: "test@test.com",
  };
  const tokenBody = (clientId) => {
    return {
      grant_type: "password",
      client_id: clientId,
      client_secret: clientId === "scicat-client-test" ? "secret" : undefined,
      username: testUser.username,
      password: testUser.password,
      scope: "openid",
    };
  };

  it("should exchange scicat token from main client", async () => {
    const res = await request(keycloakUrl)
      .post("/local-test/token")
      .type("form")
      .send(tokenBody("scicat-client-test"))
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/);

    // Avoid hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return request(appUrl)
      .post("/api/v3/auth/oidc/token")
      .send({ idToken: res.body.id_token })
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => res.body.user.email === testUser.email);
  });

  it("should exchange scicat token from first additional authorized client", async () => {
    const res = await request(keycloakUrl)
      .post("/local-test/token")
      .type("form")
      .send(tokenBody("additional-authorized-client-test-1"))
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/);

    // Avoid hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return request(appUrl)
      .post("/api/v3/auth/oidc/token")
      .send({ idToken: res.body.id_token })
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => res.body.user.email === testUser.email);
  });

  it("should exchange scicat token from second additional authorized client", async () => {
    const res = await request(keycloakUrl)
      .post("/local-test/token")
      .type("form")
      .send(tokenBody("additional-authorized-client-test-2"))
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/);

    // Avoid hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return request(appUrl)
      .post("/api/v3/auth/oidc/token")
      .send({ idToken: res.body.id_token })
      .set("Accept", "application/json")
      .expect(TestData.EntryCreatedStatusCode)
      .then((res) => res.body.user.email === testUser.email);
  });

  it("should reject token exchange from untrusted client", async () => {
    const res = await request(keycloakUrl)
      .post("/local-test/token")
      .type("form")
      .send(tokenBody("untrusted-client-test"))
      .expect(TestData.EntryValidStatusCode)
      .expect("Content-Type", /json/);

    // Avoid hitting rate limits
    await new Promise((resolve) => setTimeout(resolve, 1000));

    return request(appUrl)
      .post("/api/v3/auth/oidc/token")
      .send({ idToken: res.body.id_token })
      .set("Accept", "application/json")
      .expect(TestData.UnauthorizedStatusCode);
  });
});
