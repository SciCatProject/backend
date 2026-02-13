import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { UserPayload } from "../interfaces/userPayload.interface";
import { AccessGroupFromPayloadService } from "./access-group-from-payload.service";

describe("AccessGroupFromPayloadService", () => {
  let service: AccessGroupFromPayloadService;

  const mockConfigService = {
    get: () => "access_group_property",
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessGroupFromPayloadService, ConfigService],
    })
      .overrideProvider(ConfigService)
      .useValue(mockConfigService)
      .compile();

    service = module.get<AccessGroupFromPayloadService>(
      AccessGroupFromPayloadService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("Should resolve access groups", async () => {
    const userPayload = {
      userId: "test_user",
      accessGroupProperty: "testGroups",
      payload: {
        testGroups: ["AAA", "BBB"],
      },
    };
    const expected = userPayload.payload.testGroups;
    const actual = await service.getAccessGroups(userPayload as UserPayload);
    expect(actual).toEqual(expected);
  });
});
