import { Injectable } from "@nestjs/common";
import { QueryContainer } from "@opensearch-project/opensearch/api/_types/_common.query_dsl.js";
import { ISearchFilter } from "../interfaces/os-common.type";

/** `fast` = analyzed token lookup. `wildcard` = pattern scan, for mid-token fragments. */
export type SearchMode = "fast" | "wildcard";

@Injectable()
export class SearchQueryService {
  buildQuery(filter: ISearchFilter, mode: SearchMode): QueryContainer {
    const finalQuery = {
      bool: {
        must: [this.textQuery(filter.text, mode)],
        filter: this.filters(filter),
      },
    };

    return finalQuery;
  }

  private textQuery(
    text: string | undefined,
    mode: SearchMode,
  ): QueryContainer {
    const q = text?.trim();
    if (!q) return { match_all: {} };

    if (mode === "fast") {
      return {
        simple_query_string: {
          query: q,
          fields: ["all_text"],
          default_operator: "and",
          flags: "WHITESPACE",
        },
      };
    }

    const wildcardPattern = `*${q.replace(/([*?\\])/g, "\\$1")}*`;
    return {
      wildcard: {
        "all_text.wild": {
          value: wildcardPattern,
          case_insensitive: true,
        },
      },
    };
  }

  private accessFilter(f: ISearchFilter): QueryContainer | null {
    // ReadAny — no restriction
    if (!f.userGroups?.length && !f.isPublished) return null;

    const should: QueryContainer[] = [{ term: { isPublished: true } }];

    if (f.userGroups?.length) {
      should.push(
        { terms: { ownerGroup: f.userGroups } },
        { terms: { accessGroups: f.userGroups } },
      );
    }

    return { bool: { should, minimum_should_match: 1 } };
  }

  private filters(f: ISearchFilter): QueryContainer[] {
    const out: QueryContainer[] = [];

    const access = this.accessFilter(f);
    if (access) out.push(access);

    return out;
  }
}
