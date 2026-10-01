import { FilterQuery } from "mongoose";
import { QueryableClass } from "src/common/schemas/queryable.schema";

/** OCC = Optimistic Concurrency Control. Returns a new filter with added OCC constraint (updatedAt < unmodifiedSince),
 * if unmodifiedSince is provided. Returns the original filter unchanged otherwise.
 */
export function withOCCFilter<T extends QueryableClass>(
  filterQuery: FilterQuery<T>,
  unmodifiedSince?: Date,
): FilterQuery<T> {
  if (unmodifiedSince !== undefined) {
    filterQuery = { ...filterQuery, updatedAt: { $lte: unmodifiedSince } };
  }
  return filterQuery;
}
