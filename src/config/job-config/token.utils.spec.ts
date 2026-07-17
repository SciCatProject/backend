import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "src/users/users.service";
import { generateJobUserToken } from "./token.utils";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";

describe("token.utils", () => {
  let usersService: jest.Mocked<UsersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: UsersService,
          useValue: {
            findByUsername2JWTUser: jest.fn(),
            createUserJWT: jest.fn(),
          },
        },
      ],
    }).compile();

    usersService = module.get<UsersService>(
      UsersService,
    ) as jest.Mocked<UsersService>;
  });

  describe("generateJobUserToken", () => {
    it("should return undefined when ownerUser is undefined", async () => {
      const result = await generateJobUserToken(usersService, undefined);
      expect(result).toBeUndefined();
      expect(usersService.findByUsername2JWTUser).not.toHaveBeenCalled();
    });

    it("should return undefined when user is not found", async () => {
      usersService.findByUsername2JWTUser.mockResolvedValue(null);

      const result = await generateJobUserToken(
        usersService,
        "nonexistent-user",
      );
      expect(result).toBeUndefined();
      expect(usersService.findByUsername2JWTUser).toHaveBeenCalledWith(
        "nonexistent-user",
      );
    });

    it("should return undefined when JWT generation fails", async () => {
      const mockUser: JWTUser = {
        _id: "test-id",
        username: "testuser",
        email: "test@example.com",
        currentGroups: ["public"],
      };
      usersService.findByUsername2JWTUser.mockResolvedValue(mockUser);
      usersService.createUserJWT.mockResolvedValue(null);

      const result = await generateJobUserToken(usersService, "testuser");
      expect(result).toBeUndefined();
      expect(usersService.createUserJWT).toHaveBeenCalledWith(
        mockUser,
        undefined,
      );
    });

    it("should return JWT token when successful", async () => {
      const mockUser: JWTUser = {
        _id: "test-id",
        username: "testuser",
        email: "test@example.com",
        currentGroups: ["public"],
      };
      const mockJwt = { jwt: "test-jwt-token" };
      usersService.findByUsername2JWTUser.mockResolvedValue(mockUser);
      usersService.createUserJWT.mockResolvedValue(mockJwt);

      const result = await generateJobUserToken(usersService, "testuser");
      expect(result).toBe("test-jwt-token");
      expect(usersService.findByUsername2JWTUser).toHaveBeenCalledWith(
        "testuser",
      );
      expect(usersService.createUserJWT).toHaveBeenCalledWith(
        mockUser,
        undefined,
      );
    });
  });
});
