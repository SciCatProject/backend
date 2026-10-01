import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { RolesService } from "./roles.service";
import { UserIdentity } from "./schemas/user-identity.schema";
import { User } from "./schemas/user.schema";
import { UsersService } from "./users.service";
import { JwtService } from "@nestjs/jwt";
import { UserSettings } from "./schemas/user-settings.schema";
import { AccessGroupService } from "src/auth/access-group-provider/access-group.service";
import { AccessGroupFromStaticValuesService } from "src/auth/access-group-provider/access-group-from-static-values.service";
import { ConfigService } from "@nestjs/config";

class RolesServiceMock {}
class JwtServiceMock {}

const mockUser: User = {
  _id: "testId",
  realm: "test",
  username: "testUser",
  password: "testPassword",
  email: "test@email.com",
  emailVerified: true,
  authStrategy: "local",
  userSettings: {
    _id: "testId",
    id: "testId",
    externalSettings: {
      fe_dataset_table_filters: [
        { type: "LocationFilterComponent", visible: true },
        { type: "PidFilterComponent", visible: true },
        { type: "PidFilterContainsComponent", visible: false },
        { type: "PidFilterStartsWithComponent", visible: false },
        { type: "GroupFilterComponent", visible: true },
        { type: "TypeFilterComponent", visible: true },
        { type: "KeywordFilterComponent", visible: true },
        { type: "DateRangeFilterComponent", visible: true },
        { type: "TextFilterComponent", visible: true },
      ],
      fe_dataset_table_conditions: [],
    },
    datasetCount: 25,
    jobCount: 25,
    userId: "testUserId",
  },
};

const mockUserIdentity: UserIdentity = {
  authStrategy: "test",
  created: new Date(),
  credentials: {},
  externalId: "testExternalId",
  modified: new Date(),
  profile: {
    id: "testProfileId",
    displayName: "Test User",
    email: "test@email.com",
    username: "testUser",
    thumbnailPhoto: "testPhoto",
    emails: [],
    accessGroups: ["test"],
  },
  provider: "test",
  userId: "testId",
};

const mockUserSettings: UserSettings = {
  _id: "testId",
  id: "testId",
  externalSettings: {
    fe_dataset_table_filters: [
      { type: "LocationFilterComponent", visible: true },
      { type: "PidFilterComponent", visible: true },
      { type: "PidFilterContainsComponent", visible: false },
      { type: "PidFilterStartsWithComponent", visible: false },
      { type: "GroupFilterComponent", visible: true },
      { type: "TypeFilterComponent", visible: true },
      { type: "KeywordFilterComponent", visible: true },
      { type: "DateRangeFilterComponent", visible: true },
      { type: "TextFilterComponent", visible: true },
    ],
    fe_dataset_table_conditions: [],
  },
  datasetCount: 25,
  jobCount: 25,
  userId: "testUserId",
};

const mockUsers: User[] = [
  {
    _id: "user1",
    realm: "test",
    username: "adminUser",
    password: "hashedPassword1",
    email: "admin@test.com",
    emailVerified: true,
    authStrategy: "local",
    userSettings: mockUserSettings,
  },
  {
    _id: "user2",
    realm: "test",
    username: "regularUser",
    password: "hashedPassword2",
    email: "regular@test.com",
    emailVerified: true,
    authStrategy: "local",
    userSettings: mockUserSettings,
  },
  {
    _id: "user3",
    realm: "test",
    username: "oidcUser",
    password: "",
    email: "oidc@test.com",
    emailVerified: true,
    authStrategy: "oidc",
    userSettings: mockUserSettings,
  },
];

describe("UsersService", () => {
  let service: UsersService;
  let userModel: Model<User>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userIdentityModel: Model<UserIdentity>;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userSettingsModel: Model<UserSettings>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RolesService, useClass: RolesServiceMock },
        { provide: JwtService, useClass: JwtServiceMock },
        {
          provide: getModelToken("User"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockUser),
            constructor: jest.fn().mockResolvedValue(mockUser),
            find: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockUsers),
            }),
            findById: jest.fn().mockReturnValue({
              exec: jest.fn().mockResolvedValue(mockUser),
            }),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: getModelToken("UserIdentity"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockUserIdentity),
            constructor: jest.fn().mockResolvedValue(mockUserIdentity),
            find: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        {
          provide: getModelToken("UserSettings"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockUserSettings),
            constructor: jest.fn().mockResolvedValue(mockUserSettings),
            find: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        UsersService,
        ConfigService,
        {
          provide: AccessGroupService,
          useValue: () =>
            new AccessGroupFromStaticValuesService(["AAA", "BBB"]),
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    userModel = module.get<Model<User>>(getModelToken("User"));
    userIdentityModel = module.get<Model<UserIdentity>>(
      getModelToken("UserIdentity"),
    );
    userSettingsModel = module.get<Model<UserSettings>>(
      getModelToken("UserSettings"),
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return an array of users", async () => {
      const result = await service.findAll();

      expect(result).toEqual(mockUsers);
      expect(result.length).toBe(3);
      expect(userModel.find).toHaveBeenCalled();
    });

    it("should return empty array when no users exist", async () => {
      jest.spyOn(userModel, "find").mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      } as unknown as ReturnType<typeof userModel.find>);

      const result = await service.findAll();

      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it("should return users with expected properties", async () => {
      const result = await service.findAll();

      result.forEach((user) => {
        expect(user).toHaveProperty("_id");
        expect(user).toHaveProperty("username");
        expect(user).toHaveProperty("email");
        expect(user).toHaveProperty("authStrategy");
      });
    });

    it("should return users with different auth strategies", async () => {
      const result = await service.findAll();

      const authStrategies = result.map((user) => user.authStrategy);
      expect(authStrategies).toContain("local");
      expect(authStrategies).toContain("oidc");
    });
  });

  describe("findById", () => {
    it("should return a user by id", async () => {
      const result = await service.findById("testId");

      expect(result).toEqual(mockUser);
      expect(userModel.findById).toHaveBeenCalledWith("testId");
    });

    it("should return null when user is not found", async () => {
      jest.spyOn(userModel, "findById").mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      } as unknown as ReturnType<typeof userModel.findById>);

      const result = await service.findById("nonExistentId");

      expect(result).toBeNull();
    });
  });
});
