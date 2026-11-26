import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { UserRolesService } from "./user-roles.service";
import { UserRole } from "./schemas/user-role.schema";

const mockUserRole: UserRole = {
  userId: "testUserId",
  name: "testRole",
  created: new Date(),
  modified: new Date(),
};

describe("UserRolesService", () => {
  let service: UserRolesService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let userRoleModel: Model<UserRole>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UserRolesService,
        {
          provide: getModelToken("UserRole"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockUserRole),
            constructor: jest.fn().mockResolvedValue(mockUserRole),
            find: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<UserRolesService>(UserRolesService);
    userRoleModel = module.get<Model<UserRole>>(getModelToken("UserRole"));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
