import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "src/users/users.service";
import { AuthService } from "./auth.service";
import { OidcClientService } from "src/common/openid-client/openid-client.service";
import { OidcAuthService } from "src/common/openid-client/openid-auth.service";

class JwtServiceMock {}

class UsersServiceMock {}

class OidcClientServiceMock {}

class OidcAuthServiceMock {}

describe("AuthService", () => {
  let authService: AuthService;

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
  });

  it("should be defined", () => {
    expect(authService).toBeDefined();
  });
});
