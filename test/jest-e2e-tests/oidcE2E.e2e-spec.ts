import request from "supertest";

describe("OIDC E2E", () => {
  beforeAll(async () => {});

  it("should exchange scicat token from main client", async () => {
    const res = await fetch(
      "http://localhost:8080/realms/local-test/protocol/openid-connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: "scicat-client-test",
          client_secret: "secret",
          username: "test-username",
          password: "test-password",
          scope: "openid",
        }),
      },
    );

    const data = await res.json();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const scicatTokenRes = await request("http://localhost:3000")
      .post("/api/v3/auth/oidc/token")
      .send({ idToken: data.id_token });

    expect(scicatTokenRes.status).toBe(201);
  });

  it("should exchange scicat token from first additional authorized client ", async () => {
    const res = await fetch(
      "http://localhost:8080/realms/local-test/protocol/openid-connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: "additional-authorized-client-test-1",
          username: "test-username",
          password: "test-password",
          scope: "openid",
        }),
      },
    );

    const data = await res.json();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const scicatTokenRes = await request("http://localhost:3000")
      .post("/api/v3/auth/oidc/token")
      .send({ idToken: data.id_token });

    expect(scicatTokenRes.status).toBe(201);
  });

  it("should exchange scicat token from second additional authorized client ", async () => {
    const res = await fetch(
      "http://localhost:8080/realms/local-test/protocol/openid-connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: "additional-authorized-client-test-2",
          username: "test-username",
          password: "test-password",
          scope: "openid",
        }),
      },
    );

    const data = await res.json();

    await new Promise((resolve) => setTimeout(resolve, 1000));

    const scicatTokenRes = await request("http://localhost:3000")
      .post("/api/v3/auth/oidc/token")
      .send({ idToken: data.id_token });

    expect(scicatTokenRes.status).toBe(201);
  });

  it("should reject token exchange from untrusted client", async () => {
    const res = await fetch(
      "http://localhost:8080/realms/local-test/protocol/openid-connect/token",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "password",
          client_id: "untrusted-client",
          username: "test-username",
          password: "test-password",
          scope: "openid",
        }),
      },
    );

    const data = await res.json();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const scicatTokenRes = await request("http://localhost:3000")
      .post("/api/v3/auth/oidc/token")
      .send({ idToken: data.id_token });

    expect(scicatTokenRes.status).toBe(401);
  });
});
