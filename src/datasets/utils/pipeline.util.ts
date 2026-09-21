// extended json markers the api accepts, only dates are needed so far
const MARKER_PARSERS: Record<string, (value: unknown) => unknown> = {
  $date: (value) => new Date(value as string),
};

/**
 * Casts extended json markers in a where filter into real BSON values.
 *
 * v4 takes raw mongo operators, so the client writes the query itself and
 * nothing translates it. JSON cannot express BSON types like Date or
 * ObjectId, so the client marks them, `{ "$date": "2026-08-31" }`, and we turn
 * them back into real values before the query runs.
 */
export function castWhereFilter<T>(value: T): T {
  if (value === null || typeof value !== "object" || value instanceof Date) {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(castWhereFilter) as T;
  }

  const entries = Object.entries(value as Record<string, unknown>);

  if (entries.length === 1) {
    const [marker, markerValue] = entries[0];
    const parse = MARKER_PARSERS[marker];
    if (parse) return parse(markerValue) as T;
  }

  return Object.fromEntries(
    entries.map(([key, val]) => [key, castWhereFilter(val)]),
  ) as T;
}
