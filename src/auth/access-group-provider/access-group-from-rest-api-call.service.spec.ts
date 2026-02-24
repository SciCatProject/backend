import { HttpService } from "@nestjs/axios";
import { Test, TestingModule } from "@nestjs/testing";
import { UserPayload } from "../interfaces/userPayload.interface";
import { AccessGroupFromRestApiService } from "./access-group-from-rest-api-call.service";

describe("AccessGroupFromRestApiService", () => {
  const mockResponse = ["AAA", "BBB"];

  let service: AccessGroupFromRestApiService;
  const mockAccessGroupService = new AccessGroupFromRestApiService(
    "",
    {},
    "payload.id",
    new HttpService(),
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessGroupFromRestApiService],
    })
      .overrideProvider(AccessGroupFromRestApiService)
      .useValue(mockAccessGroupService)
      .compile();

    service = module.get<AccessGroupFromRestApiService>(
      AccessGroupFromRestApiService,
    );

    jest.spyOn(service, "callRestApi").mockImplementation(async () => {
      return mockResponse;
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("Should resolve access groups", async () => {
    const expected = ["AAA", "BBB"];
    const actual = await service.getAccessGroups({
      userId: "12378",
      payload: { id: "123" },
    } as UserPayload);
    expect(actual).toEqual(expected);
  });
});
