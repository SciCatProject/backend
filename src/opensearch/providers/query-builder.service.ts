import { Injectable, Logger } from "@nestjs/common";
import { MustFields } from "./fields.enum";

import { QueryContainer } from "@opensearch-project/opensearch/api/_types/_common.query_dsl";
import { ISearchFilter } from "../interfaces/os-common.type";

@Injectable()
export class SearchQueryService {
  readonly mustFields = [...Object.values(MustFields)];
  readonly textQuerySplitMethod = /[ ,]+/;

  public buildSearchQuery(filter: ISearchFilter) {
    try {
      const accessFilter = this.buildFilterFields(filter);
      const textQuery = this.buildTextQuery(filter);

      // NOTE: The final query flow is as follows:
      // step 1. Build filter fields conditions must match all filter fields
      // step 2. Build should fields conditions must match at least one should field
      // step 3. Build text query conditions must match all text query fields
      return this.constructFinalQuery(accessFilter, textQuery);
    } catch (err) {
      Logger.error("Open search build search query failed", err);
      throw err;
    }
  }
  private buildFilterFields(fields: ISearchFilter): QueryContainer[] {
    const filter: QueryContainer[] = [];

    if (fields.userGroups) {
      filter.push({
        bool: {
          should: [
            { terms: { ownerGroup: fields.userGroups } },
            { terms: { accessGroup: fields.userGroups } },
          ],
          minimum_should_match: 1,
        },
      });
    } else if (!fields.isAdmin) {
      filter.push({
        term: {
          isPublished: true,
        },
      });
    }

    return filter;
  }

  private buildTextQuery(filter: ISearchFilter): QueryContainer[] {
    let wildcardQueries: QueryContainer[] = [];

    //NOTE: if text field is present, we query both datasetName and description fields
    if (filter.text) {
      wildcardQueries = this.buildWildcardQueries(filter.text);
    }

    return wildcardQueries.length > 0
      ? [{ bool: { should: wildcardQueries, minimum_should_match: 1 } }]
      : [];
  }

  private splitSearchText(text: string): string[] {
    return text
      .toLowerCase()
      .trim()
      .split(this.textQuerySplitMethod)
      .filter(Boolean);
  }

  private buildWildcardQueries(text: string): QueryContainer[] {
    const terms = this.splitSearchText(text);
    return terms.flatMap((term) =>
      this.mustFields.map((fieldName) => ({
        wildcard: { [fieldName]: { value: `*${term}*` } },
      })),
    );
  }

  private constructFinalQuery(
    accessFilter: QueryContainer[],
    textQuery: QueryContainer[],
  ) {
    const finalQuery = {
      query: {
        bool: {
          filter: accessFilter,
          must: textQuery,
        },
      },
    };

    return finalQuery;
  }
}
