import configuration from "./configuration";

describe("configuration", () => {
  beforeEach(() => {
    process.env = {};
  });

  it("should generate clientConfig with default client 'scicat'", () => {
    process.env.OIDC_SUCCESS_URL =
      "https://default-success-url.com/auth-callback";
    process.env.OIDC_RETURN_URL = "/datasets";

    const config = configuration();

    expect(config.oidc.clientConfig).toEqual({
      scicat: {
        successUrl: "https://default-success-url.com/auth-callback",
        returnUrl: "/datasets",
      },
    });
  });

  it("should generate clientConfig with additional clients from environment variables", () => {
    process.env.OIDC_FRONTEND_CLIENTS = "client1,client2";
    process.env.OIDC_CLIENT1_SUCCESS_URL = "https://client1-success-url.com";
    process.env.OIDC_CLIENT1_RETURN_URL = "/client1-homepage";
    process.env.OIDC_CLIENT2_SUCCESS_URL = "https://client2-success-url.com";
    process.env.OIDC_CLIENT2_RETURN_URL = "/client2-homepage";

    const config = configuration();

    expect(config.oidc.clientConfig).toEqual({
      scicat: {
        successUrl: undefined,
        returnUrl: undefined,
      },
      client1: {
        successUrl: "https://client1-success-url.com",
        returnUrl: "/client1-homepage",
      },
      client2: {
        successUrl: "https://client2-success-url.com",
        returnUrl: "/client2-homepage",
      },
    });
  });

  it("should deduplicate 'scicat' client if included in OIDC_FRONTEND_CLIENTS", () => {
    process.env.OIDC_FRONTEND_CLIENTS = "scicat,client1";
    process.env.OIDC_SUCCESS_URL = "https://default-success-url.com/login";
    process.env.OIDC_RETURN_URL = "/datasets";
    process.env.OIDC_CLIENT1_SUCCESS_URL = "https://client1-success-url.com";
    process.env.OIDC_CLIENT1_RETURN_URL = "/client1-homepage";

    const config = configuration();

    expect(config.oidc.clientConfig).toEqual({
      scicat: {
        successUrl: "https://default-success-url.com/login",
        returnUrl: "/datasets",
      },
      client1: {
        successUrl: "https://client1-success-url.com",
        returnUrl: "/client1-homepage",
      },
    });
  });

  it("should throw error if client is defined but no OIDC_${CLIENT}_SUCCESS_URL is set", () => {
    process.env.OIDC_FRONTEND_CLIENTS = "client1";
    process.env.OIDC_SUCCESS_URL = "https://default-success-url.com/login";

    expect(configuration).toThrow(
      "Frontend client client1 is defined in OIDC_FRONTEND_CLIENTS but OIDC_CLIENT1_SUCCESS_URL is unset",
    );
  });

  it("should throw error if default successUrl has path other than /auth-callback or /login", () => {
    process.env.OIDC_SUCCESS_URL = "https://default-success-url.com/user";
    process.env.OIDC_RETURN_URL = "/datasets";

    expect(configuration).toThrow(
      "OIDC_SUCCESS_URL must be <frontend-base-url>/login or <frontend-base-url>/auth-callback for the default client scicat but found https://default-success-url.com/user",
    );
  });

  it("should enable config reload by default", () => {
    const config = configuration();

    expect(config.configSyncToDb.reload).toBe(true);
  });

  it("should disable config reload when CONFIG_SYNC_TO_DB_RELOAD is false", () => {
    process.env.CONFIG_SYNC_TO_DB_RELOAD = "false";

    const config = configuration();

    expect(config.configSyncToDb.reload).toBe(false);
  });
});
