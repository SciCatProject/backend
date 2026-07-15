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
            findById2JWTUser: jest.fn(),
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
    it("should return undefined when userId is undefined", async () => {
      const result = await generateJobUserToken(usersService, undefined);
      expect(result).toBeUndefined();
      expect(usersService.findById2JWTUser).not.toHaveBeenCalled();
    });

    it("should return undefined when user is not found", async () => {
      usersService.findById2JWTUser.mockResolvedValue(null);

      const result = await generateJobUserToken(usersService, "nonexistent-id");
      expect(result).toBeUndefined();
      expect(usersService.findById2JWTUser).toHaveBeenCalledWith(
        "nonexistent-id",
      );
    });

    it("should return undefined when JWT generation fails", async () => {
      const mockUser: JWTUser = {
        _id: "test-id",
        username: "testuser",
        email: "test@example.com",
        currentGroups: ["public"],
      };
      usersService.findById2JWTUser.mockResolvedValue(mockUser);
      usersService.createUserJWT.mockResolvedValue(null);

      const result = await generateJobUserToken(usersService, "test-id");
      expect(result).toBeUndefined();
      expect(usersService.createUserJWT).toHaveBeenCalledWith(mockUser);
    });

    it("should return JWT token when successful", async () => {
      const mockUser: JWTUser = {
        _id: "test-id",
        username: "testuser",
        email: "test@example.com",
        currentGroups: ["public"],
      };
      const mockJwt = { jwt: "test-jwt-token" };
      usersService.findById2JWTUser.mockResolvedValue(mockUser);
      usersService.createUserJWT.mockResolvedValue(mockJwt);

      const result = await generateJobUserToken(usersService, "test-id");
      expect(result).toBe("test-jwt-token");
      expect(usersService.findById2JWTUser).toHaveBeenCalledWith("test-id");
      expect(usersService.createUserJWT).toHaveBeenCalledWith(mockUser);
    });
  });
});
