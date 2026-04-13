import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "src/users/users.service";
import { AuthService } from "./auth.service";

class JwtServiceMock {}

class UsersServiceMock {}

describe("AuthService", () => {
  let authService: AuthService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        ConfigService,
        { provide: JwtService, useClass: JwtServiceMock },
        { provide: UsersService, useClass: UsersServiceMock },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it("should be defined", () => {
    expect(authService).toBeDefined();
  });
});
