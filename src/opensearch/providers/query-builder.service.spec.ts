import { Test, TestingModule } from "@nestjs/testing";
import { SearchQueryService } from "./query-builder.service";
import { ISearchFilter } from "../interfaces/os-common.type";

describe("SearchQueryService", () => {
  let service: SearchQueryService;

  const filterWithText = {
    text: "fake text",
    userGroups: ["fake"],
    isPublished: false,
  } as ISearchFilter;

  const filterWithoutText = {
    text: "",
    userGroups: ["fake"],
    isPublished: false,
  } as ISearchFilter;

  const filterUnrestricted = {
    text: "fake text",
    userGroups: [],
    isPublished: false,
  } as ISearchFilter;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchQueryService],
    }).compile();

    service = module.get<SearchQueryService>(SearchQueryService);
  });

  it("should properly load SearchQueryService", () => {
    expect(service).toBeDefined();
  });

  describe("buildQuery", () => {
    it("should resolve a query with text and filters", () => {
      const actual = service.buildQuery(filterWithText, "fast");

      expect(actual).toEqual({
        bool: {
          must: [
            {
              simple_query_string: {
                query: "fake text",
                fields: ["all_text"],
                default_operator: "and",
                flags: "WHITESPACE",
              },
            },
          ],
          filter: [
            {
              bool: {
                should: [
                  { term: { isPublished: true } },
                  { terms: { ownerGroup: ["fake"] } },
                  { terms: { accessGroups: ["fake"] } },
                ],
                minimum_should_match: 1,
              },
            },
          ],
        },
      });
    });

    it("should resolve a query that contains only filters without text", () => {
      const actual = service.buildQuery(filterWithoutText, "fast");

      expect(actual.bool.must).toEqual([{ match_all: {} }]);
      expect(actual.bool.filter).toHaveLength(1);
    });

    it("should not apply an access filter when the user may read anything", () => {
      const actual = service.buildQuery(filterUnrestricted, "fast");

      expect(actual.bool.filter).toEqual([]);
    });

    it("should restrict to published documents when no user groups are given", () => {
      const actual = service.buildQuery(
        { ...filterUnrestricted, isPublished: true },
        "fast",
      );

      expect(actual.bool.filter).toEqual([
        {
          bool: {
            should: [{ term: { isPublished: true } }],
            minimum_should_match: 1,
          },
        },
      ]);
    });
  });

  describe("text query modes", () => {
    it("should build a simple_query_string in fast mode", () => {
      const actual = service.buildQuery(filterWithText, "fast");

      expect(actual.bool.must[0]).toHaveProperty("simple_query_string");
    });

    it("should build a wildcard query in wildcard mode", () => {
      const actual = service.buildQuery(filterWithText, "wildcard");

      expect(actual.bool.must[0]).toEqual({
        wildcard: {
          "all_text.wild": {
            value: "*fake text*",
            case_insensitive: true,
          },
        },
      });
    });

    it("should escape wildcard metacharacters in the search term", () => {
      const actual = service.buildQuery(
        { ...filterWithText, text: "  a*b?c\\d  " },
        "wildcard",
      );

      expect(actual.bool.must[0]).toEqual({
        wildcard: {
          "all_text.wild": {
            value: "*a\\*b\\?c\\\\d*",
            case_insensitive: true,
          },
        },
      });
    });

    it("should fall back to match_all when the text is only whitespace", () => {
      const actual = service.buildQuery(
        { ...filterWithText, text: "   " },
        "wildcard",
      );

      expect(actual.bool.must).toEqual([{ match_all: {} }]);
    });
  });
});
