import { Test, TestingModule } from "@nestjs/testing";
import { UserPayload } from "../interfaces/userPayload.interface";
import { AccessGroupFromMultipleProvidersService } from "./access-group-from-multiple-providers.service";

describe("AccessGroupFromMultipleProvidersService", () => {
  let service: AccessGroupFromMultipleProvidersService;

  beforeEach(async () => {
    const mockAccessGroupService1 = {
      getAccessGroups: async () => ["AAA", "BBB"],
    };

    const mockAccessGroupService2 = {
      getAccessGroups: async () => ["CCC", "DDD"],
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessGroupFromMultipleProvidersService],
    })
      .overrideProvider(AccessGroupFromMultipleProvidersService)
      .useValue(
        new AccessGroupFromMultipleProvidersService([
          mockAccessGroupService1,
          mockAccessGroupService2,
        ]),
      )
      .compile();

    service = module.get<AccessGroupFromMultipleProvidersService>(
      AccessGroupFromMultipleProvidersService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("Should resolve access groups", async () => {
    const expected = ["AAA", "BBB", "CCC", "DDD"];
    const actual = await service.getAccessGroups({} as UserPayload);
    expect(actual).toEqual(expected);
  });
});
