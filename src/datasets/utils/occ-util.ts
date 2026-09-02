import { NotFoundException, PreconditionFailedException } from "@nestjs/common";
import { FilterQuery, Model, QueryOptions, UpdateQuery } from "mongoose";
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

/**
 * The updatedAt written by an OCC-guarded update must be strictly after
 * unmodifiedSince: withOCCFilter matches on `updatedAt <= unmodifiedSince`,
 * and MongoDB serializes writes to a single document, so the next concurrent
 * request with the same precondition re-checks that filter against whatever
 * this write just committed. If both requests raced within the same
 * millisecond, `new Date()` could tie unmodifiedSince instead of beating it,
 * letting the second write match the filter too and defeating the guard.
 *
 * Callers must also pass `{ timestamps: false }` in the Mongoose write's
 * options - otherwise the schema's own `{ timestamps: true }` write hook
 * overwrites this value with its own `new Date()` right before the query is
 * sent, silently reopening the same race.
 */
export function nextOCCTimestamp(unmodifiedSince?: Date): Date {
  const now = new Date();
  if (unmodifiedSince && now.getTime() <= unmodifiedSince.getTime()) {
    return new Date(unmodifiedSince.getTime() + 1);
  }
  return now;
}

export async function findOneAndUpdateWithOCC<T extends QueryableClass>(
  model: Model<T>,
  filter: FilterQuery<T>,
  update: UpdateQuery<T>,
  unmodifiedSince: Date | undefined,
  notFoundMessage: string,
  modifiedMessage: string,
  queryOptions: QueryOptions<T> = {},
): Promise<T> {
  const queryFilter = withOCCFilter(filter, unmodifiedSince);
  const updated = await model
    .findOneAndUpdate(
      queryFilter,
      { ...update, updatedAt: nextOCCTimestamp(unmodifiedSince) },
      // timestamps: false so Mongoose's own updatedAt auto-management
      // doesn't clobber nextOCCTimestamp's value and reopen the
      // same-millisecond OCC race.
      { new: true, timestamps: false, ...queryOptions },
    )
    .exec();

  if (!updated) {
    if (!unmodifiedSince) {
      throw new NotFoundException(notFoundMessage);
    }
    throw new PreconditionFailedException(modifiedMessage);
  }

  return updated;
}
