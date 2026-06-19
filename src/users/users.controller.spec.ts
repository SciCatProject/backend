import { Test, TestingModule } from "@nestjs/testing";
import { AuthService } from "src/auth/auth.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { UpdateUserSettingsDto } from "./dto/update-user-settings.dto";
import { Request } from "express";
import { UserSettings } from "./schemas/user-settings.schema";
import { Action } from "src/casl/action.enum";
import { User } from "./schemas/user.schema";
import { ReturnedUserDto } from "./dto/returned-user.dto";

const mockUsers: ReturnedUserDto[] = [
  {
    id: "user1",
    username: "adminUser",
    email: "admin@test.com",
    authStrategy: "local",
  },
  {
    id: "user2",
    username: "regularUser",
    email: "regular@test.com",
    authStrategy: "local",
  },
  {
    id: "user3",
    username: "anotherUser",
    email: "another@test.com",
    authStrategy: "oidc",
  },
];

class UsersServiceMock {
  findByIdUserIdentity(id: string) {
    return { id };
  }

  async findByIdUserSettings() {
    return mockUserSettings;
  }

  async findOneAndUpdateUserSettings(
    userId: string,
    updateUserSettingsDto: UpdateUserSettingsDto,
  ) {
    return { ...updateUserSettingsDto, _id: userId };
  }

  async findAll(): Promise<ReturnedUserDto[]> {
    return mockUsers;
  }

  async findById(id: string): Promise<ReturnedUserDto | null> {
    return mockUsers.find((user) => user.id === id) || null;
  }
}

const mockUserSettings = {
  _id: "user1",
  userId: "user1",
  datasetCount: 25,
  jobCount: 25,
  externalSettings: {
    fe_dataset_table_filters: [{ LocationFilter: true }, { PidFilter: true }],
    fe_dataset_table_conditions: [
      { field: "status", value: "active", operator: "equals" },
    ],
    fe_dataset_table_columns: [],
  },
};

class AuthServiceMock {}

class CaslAbilityFactoryMock {
  userEndpointAccess = jest.fn();
}

describe("UsersController", () => {
  let controller: UsersController;
  let usersService: UsersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: AuthService, useClass: AuthServiceMock },
        { provide: UsersService, useClass: UsersServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    usersService = module.get<UsersService>(UsersService);

    jest
      .spyOn(controller as UsersController, "checkUserAuthorization")
      .mockImplementation(() => Promise.resolve());
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should return user settings with filters and conditions", async () => {
    const userId = "user1";
    mockUserSettings._id = userId;

    const mockRequest: Partial<Request> = {
      user: { _id: userId },
    };

    const result = await controller.getSettings(mockRequest as Request, userId);

    // Assert
    expect(result).toEqual(mockUserSettings);
    expect(result?.externalSettings?.fe_dataset_table_filters).toBeDefined();
    expect(
      (
        result?.externalSettings?.fe_dataset_table_filters as Record<
          string,
          unknown
        >
      ).length,
    ).toBeGreaterThan(0);
    expect(result?.externalSettings?.fe_dataset_table_conditions).toBeDefined();
    expect(
      (
        result?.externalSettings?.fe_dataset_table_conditions as Record<
          string,
          unknown
        >
      ).length,
    ).toBeGreaterThan(0);
  });

  it("should update user settings with filters and conditions", async () => {
    const userId = "user-id";
    mockUserSettings._id = userId;

    const updatedSettings = {
      ...mockUserSettings,
      externalSettings: {
        fe_dataset_table_filters: [{ PidFilter: true }],
        fe_dataset_table_conditions: [
          { field: "status", value: "inactive", operator: "equals" },
        ],
        fe_dataset_table_columns: [],
      },
    };

    const mockRequest: Partial<Request> = {
      user: { _id: userId },
    };

    const expectedResponse: UserSettings = {
      ...updatedSettings,
      _id: userId,
      userId: userId,
      datasetCount: updatedSettings.datasetCount,
      jobCount: updatedSettings.jobCount,
      externalSettings: updatedSettings.externalSettings,
    };

    jest
      .spyOn(usersService, "findOneAndUpdateUserSettings")
      .mockResolvedValue(expectedResponse);

    const result = await controller.updateSettings(
      mockRequest as Request,
      userId,
      updatedSettings,
    );

    expect(result).toEqual(expectedResponse);
    expect(result?.externalSettings?.fe_dataset_table_filters).toBeDefined();
    expect(
      (
        result?.externalSettings?.fe_dataset_table_filters as Record<
          string,
          unknown[]
        >
      ).length,
    ).toBe(1);
    expect(result?.externalSettings?.fe_dataset_table_conditions).toBeDefined();
    expect(
      (
        result?.externalSettings?.fe_dataset_table_conditions as Record<
          string,
          unknown[]
        >
      ).length,
    ).toBe(1);
  });

  describe("findAll", () => {
    let caslAbilityFactory: CaslAbilityFactory;

    beforeEach(() => {
      caslAbilityFactory = (
        controller as unknown as { caslAbilityFactory: CaslAbilityFactory }
      ).caslAbilityFactory;
    });

    it("should return all users when admin user has UserListAll permission", async () => {
      const adminUserId = "user1";
      const mockRequest: Partial<Request> = {
        user: {
          _id: adminUserId,
          username: "adminUser",
          currentGroups: ["admin"],
        },
      };

      // Mock the ability to allow UserListAll
      const mockAbility = {
        can: jest.fn((action: Action, subject: typeof User) => {
          if (action === Action.UserListAll && subject === User) {
            return true;
          }
          return false;
        }),
      };
      (caslAbilityFactory.userEndpointAccess as jest.Mock).mockReturnValue(
        mockAbility,
      );

      jest.spyOn(usersService, "findAll").mockResolvedValue(mockUsers);

      const result = await controller.findAll(mockRequest as Request);

      expect(result).toEqual(mockUsers);
      expect(result.length).toBe(3);
      expect(usersService.findAll).toHaveBeenCalled();
      expect(caslAbilityFactory.userEndpointAccess).toHaveBeenCalledWith(
        mockRequest.user,
      );
    });

    it("should return only own user info when regular user has UserListOwn but not UserListAll permission", async () => {
      const regularUserId = "user2";
      const mockRequest: Partial<Request> = {
        user: {
          _id: regularUserId,
          username: "regularUser",
          currentGroups: ["users"],
        },
      };

      // Mock the ability to deny UserListAll but allow UserListOwn
      const mockAbility = {
        can: jest.fn((action: Action, subject: typeof User) => {
          if (action === Action.UserListAll && subject === User) {
            return false;
          }
          if (action === Action.UserListOwn && subject === User) {
            return true;
          }
          return false;
        }),
      };
      (caslAbilityFactory.userEndpointAccess as jest.Mock).mockReturnValue(
        mockAbility,
      );

      const expectedUser = mockUsers.find((u) => u.id === regularUserId)!;
      jest.spyOn(usersService, "findById").mockResolvedValue(expectedUser);

      const result = await controller.findAll(mockRequest as Request);

      expect(result).toEqual([expectedUser]);
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(regularUserId);
      expect(usersService.findById).toHaveBeenCalledWith(regularUserId);
      expect(caslAbilityFactory.userEndpointAccess).toHaveBeenCalledWith(
        mockRequest.user,
      );
    });

    it("should return empty array when user is not found in database", async () => {
      const nonExistentUserId = "nonExistentUser";
      const mockRequest: Partial<Request> = {
        user: {
          _id: nonExistentUserId,
          username: "ghostUser",
          currentGroups: ["users"],
        },
      };

      // Mock the ability to deny UserListAll
      const mockAbility = {
        can: jest.fn((action: Action, subject: typeof User) => {
          if (action === Action.UserListAll && subject === User) {
            return false;
          }
          return true;
        }),
      };
      (caslAbilityFactory.userEndpointAccess as jest.Mock).mockReturnValue(
        mockAbility,
      );

      jest.spyOn(usersService, "findById").mockResolvedValue(null);

      const result = await controller.findAll(mockRequest as Request);

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
      expect(usersService.findById).toHaveBeenCalledWith(nonExistentUserId);
    });

    it("should call userEndpointAccess with authenticated user", async () => {
      const userId = "user1";
      const mockUser = {
        _id: userId,
        username: "testUser",
        email: "test@test.com",
        currentGroups: ["admin"],
      };
      const mockRequest: Partial<Request> = {
        user: mockUser,
      };

      const mockAbility = {
        can: jest.fn().mockReturnValue(true),
      };
      (caslAbilityFactory.userEndpointAccess as jest.Mock).mockReturnValue(
        mockAbility,
      );

      jest.spyOn(usersService, "findAll").mockResolvedValue(mockUsers);

      await controller.findAll(mockRequest as Request);

      expect(caslAbilityFactory.userEndpointAccess).toHaveBeenCalledWith(
        mockUser,
      );
    });

    it("should return users with correct DTO structure", async () => {
      const adminUserId = "user1";
      const mockRequest: Partial<Request> = {
        user: {
          _id: adminUserId,
          username: "adminUser",
          currentGroups: ["admin"],
        },
      };

      const mockAbility = {
        can: jest.fn((action: Action) => action === Action.UserListAll),
      };
      (caslAbilityFactory.userEndpointAccess as jest.Mock).mockReturnValue(
        mockAbility,
      );

      jest.spyOn(usersService, "findAll").mockResolvedValue(mockUsers);

      const result = await controller.findAll(mockRequest as Request);

      // Verify each user has the expected properties
      result.forEach((user) => {
        expect(user).toHaveProperty("id");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("authStrategy");
      });
    });

    it("should not call findAll service when user lacks UserListAll permission", async () => {
      const regularUserId = "user2";
      const mockRequest: Partial<Request> = {
        user: {
          _id: regularUserId,
          username: "regularUser",
          currentGroups: ["users"],
        },
      };

      const mockAbility = {
        can: jest.fn((action: Action) => action !== Action.UserListAll),
      };
      (caslAbilityFactory.userEndpointAccess as jest.Mock).mockReturnValue(
        mockAbility,
      );

      const expectedUser = mockUsers.find((u) => u.id === regularUserId)!;
      jest.spyOn(usersService, "findById").mockResolvedValue(expectedUser);
      const findAllSpy = jest.spyOn(usersService, "findAll");

      await controller.findAll(mockRequest as Request);

      expect(findAllSpy).not.toHaveBeenCalled();
      expect(usersService.findById).toHaveBeenCalledWith(regularUserId);
    });
  });
});
