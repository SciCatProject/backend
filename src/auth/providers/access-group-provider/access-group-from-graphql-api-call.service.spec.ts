import { HttpService } from "@nestjs/axios";
import { Test, TestingModule } from "@nestjs/testing";
import { UserPayload } from "../interfaces/userPayload.interface";
import { AccessGroupFromGraphQLApiService } from "./access-group-from-graphql-api-call.service";

describe("AccessGroupFromGraphQLApiService", () => {
  const mockResponse = {
    data: [{ id: "AAA" }, { id: "BBB" }],
  };

  let service: AccessGroupFromGraphQLApiService;
  const mockAccessGroupService = new AccessGroupFromGraphQLApiService(
    "",
    "",
    {},
    (result) => (result as typeof mockResponse).data.map(({ id }) => id),
    new HttpService(),
  );

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccessGroupFromGraphQLApiService],
    })
      .overrideProvider(AccessGroupFromGraphQLApiService)
      .useValue(mockAccessGroupService)
      .compile();

    service = module.get<AccessGroupFromGraphQLApiService>(
      AccessGroupFromGraphQLApiService,
    );

    jest.spyOn(service, "callGraphQLApi").mockImplementation(async () => {
      return mockResponse;
    });
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("Should resolve access groups", async () => {
    const expected = ["AAA", "BBB"];
    const actual = await service.getAccessGroups({} as UserPayload);
    expect(actual).toEqual(expected);
  });
});
