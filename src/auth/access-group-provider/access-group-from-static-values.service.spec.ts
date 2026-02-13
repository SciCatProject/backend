import { Test, TestingModule } from "@nestjs/testing";
import { AccessGroupFromStaticValuesService } from "./access-group-from-static-values.service";

describe("AccessGroupFromStaticValuesService", () => {
  let service: AccessGroupFromStaticValuesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessGroupFromStaticValuesService],
    })
      .overrideProvider(AccessGroupFromStaticValuesService)
      .useValue(new AccessGroupFromStaticValuesService(["AAA", "BBB"]))
      .compile();

    service = module.get<AccessGroupFromStaticValuesService>(
      AccessGroupFromStaticValuesService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("Should resolve access groups", async () => {
    const expected = ["AAA", "BBB"];
    const actual = await service.getAccessGroups();
    expect(actual).toEqual(expected);
  });
});
