import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "src/users/users.service";
import { AuthService } from "./auth.service";
import { OidcClientService } from "src/common/openid-client/openid-client.service";
import { OidcAuthService } from "src/common/openid-client/openid-auth.service";

class JwtServiceMock {
  sign = jest.fn();
}

class UsersServiceMock {
  findByIdUserSettings = jest.fn().mockResolvedValue({});
  createUserSettings = jest.fn().mockResolvedValue({});
}

class OidcClientServiceMock {
  getClient = jest.fn();
}

class OidcAuthServiceMock {
  validate = jest.fn();
}
describe("AuthService", () => {
  let authService: AuthService;
  let oidcClientService: OidcClientServiceMock;
  let oidcAuthService: OidcAuthServiceMock;
  let jwtService: JwtServiceMock;
  let configService: ConfigService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        ConfigService,
        { provide: JwtService, useClass: JwtServiceMock },
        { provide: UsersService, useClass: UsersServiceMock },
        { provide: OidcClientService, useClass: OidcClientServiceMock },
        { provide: OidcAuthService, useClass: OidcAuthServiceMock },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
    oidcClientService = module.get(OidcClientService);
    oidcAuthService = module.get(OidcAuthService);
    jwtService = module.get(JwtService);
    configService = module.get(ConfigService);
  });

  it("should be defined", () => {
    expect(authService).toBeDefined();
  });

  describe("Oidc Token Login", () => {
    const mockIdToken = "valid-id-token";
    const mockUser = { _id: "user_123", email: "test@example.com" };
    const mockAccessToken = "signed-jwt-token";
    const mockExpiresIn = 3600;

    it("should successfully validate token and return auth login dto", async () => {
      const postLoginSpy = jest.spyOn(authService, "postLoginTasks");

      const mockClient = {
        callback: jest.fn().mockResolvedValue({ id_token: mockIdToken }),
      };
      oidcClientService.getClient.mockResolvedValue(mockClient);

      jest.spyOn(configService, "get").mockImplementation((key: string) => {
        if (key === "oidc.callbackURL") return "http://localhost/callback";
        if (key === "jwt.expiresIn") return mockExpiresIn;
        return null;
      });

      oidcAuthService.validate.mockResolvedValue(mockUser);
      jwtService.sign.mockReturnValue(mockAccessToken);

      const result = await authService.oidcTokenLogin(mockIdToken);

      expect(result.access_token).toBe(mockAccessToken);
      expect(result.userId).toBe(mockUser._id);
      expect(postLoginSpy).toHaveBeenCalledWith(mockUser);
    });
  });
});
