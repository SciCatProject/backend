import { Test, TestingModule } from "@nestjs/testing";
import { SearchQueryService } from "./query-builder.service";

describe("SearchQueryService", () => {
  let service: SearchQueryService;

  const mockSearchQueryWithoutFilters = {
    text: "fake text",
    ownerGroup: ["fake"],
    creationLocation: ["fake"],
    type: ["fake"],
    keywords: ["fake"],
    isPublished: false,
  };

  const mockSearcQueryhWitoutText = {
    text: "",
    ownerGroup: ["fake"],
    creationLocation: ["fake"],
    type: ["fake"],
    keywords: ["fake"],
    isPublished: false,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchQueryService],
    }).compile();

    service = module.get<SearchQueryService>(SearchQueryService);
  });

  it("should properly load SearchQueryService", () => {
    expect(service).toBeDefined();
  });

  it("should resolve search query with text and filters", () => {
    const actual = service.buildSearchQuery(mockSearchQueryWithoutFilters);
    expect(actual).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.any(Array),
            must: expect.any(Array),
          }),
        }),
      }),
    );
  });

  it("should resolve query that contains only filters without text", () => {
    const actual = service.buildSearchQuery(mockSearcQueryhWitoutText);
    expect(actual).toEqual(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.any(Array),
          }),
        }),
      }),
    );
  });
});
