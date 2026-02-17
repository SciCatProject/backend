import { Injectable, PipeTransform } from "@nestjs/common";
import { IFilters } from "../interfaces/common.interface";
import { get, isEmpty, isPlainObject, mapKeys } from "lodash";
import { normalizeProjection } from "../utils";

type KeyMap = Record<string, string>;

type Func = (value: unknown) => unknown;

type FuncMap = Record<string, (value: unknown, parent: unknown) => unknown>;

interface TransformDeepOptions {
  keyMap?: KeyMap;
  funcMap?: FuncMap;
  arrayFn?: Func;
  valueFn?: Func;
}

/**
 * @class FilterPipeAbstract
 * @description
 * An abstract base class for filter-related pipes providing recursive transformation logic.
 * - Handles the standard NestJS `PipeTransform` interface.
 * - Orchestrates JSON parsing for incoming strings or nested stringified objects.
 * - Provides `transformDeep`, a static utility for recursive object traversal and key/value manipulation.
 * - Distinguishes between flat filter objects and nested `{ filter: ... }` structures.
 */
export abstract class FilterPipeAbstract<T = unknown> implements PipeTransform<
  { filter?: string | IFilters<T> } | string | IFilters<T>,
  | { filter?: IFilters<T> }
  | IFilters<T>
  | unknown
  | Record<string, unknown>
  | unknown[]
> {
  abstract applyTransform(value: unknown): unknown;

  protected apiToDBMap: Record<string, string>;

  constructor({
    apiToDBMap = {},
  }: { apiToDBMap?: Record<string, string> } = {}) {
    this.apiToDBMap = apiToDBMap;
  }

  private static parseJson(value: string): string {
    if (!value || typeof value !== "string") return value;
    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  protected static transformDeep(
    obj: unknown,
    opts: TransformDeepOptions = {},
  ): unknown {
    const { keyMap = {}, funcMap = {}, arrayFn, valueFn } = opts;

    if (Array.isArray(obj)) {
      return obj.map((item) =>
        arrayFn
          ? arrayFn(this.transformDeep(item, opts))
          : this.transformDeep(item, opts),
      );
    }

    if (obj && typeof obj === "object") {
      const newObj: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(obj)) {
        const mappedKey = keyMap[key] ?? key;
        let transformed: unknown;
        if (funcMap[key]) {
          transformed = funcMap[key](value, newObj);
        } else {
          transformed = this.transformDeep(value, opts);
        }
        newObj[mappedKey] = valueFn ? valueFn(transformed) : transformed;
      }
      return newObj;
    }

    return obj;
  }

  private hasFilterDataProperty(
    obj: Record<string, unknown> | unknown[],
  ): obj is { filter: unknown } {
    return Object.hasOwn(obj, "filter") && typeof obj.filter !== "function";
  }

  transform(
    inValue:
      | { filter?: string | IFilters<T> }
      | string
      | IFilters<T>
      | unknown[]
      | Record<string, unknown>
      | unknown,
  ):
    | {
        filter?: IFilters<T>;
      }
    | IFilters<T>
    | unknown
    | Record<string, unknown>
    | unknown[] {
    if (!inValue) return inValue as { filter?: IFilters<T> } | IFilters<T>;
    const parsedFilter = FilterPipeAbstract.transformDeep(
      FilterPipeAbstract.parseJson(inValue as string),
      { valueFn: (val) => FilterPipeAbstract.parseJson(val as string) },
    ) as Record<string, unknown> | unknown[];

    if (!this.hasFilterDataProperty(parsedFilter))
      return this.applyTransform(parsedFilter);
    const transformedFilter = this.applyTransform(parsedFilter.filter);
    return { ...parsedFilter, filter: transformedFilter };
  }
}

/**
 * @class WherePipe
 * @description
 * Specialized pipe for transforming Loopback-style "where" queries into MongoDB/Mongoose filters.
 * - Maps standard API operators (inq, nin, and, or, like) to MongoDB equivalents ($in, $and, etc.).
 * - Automatically handles `ilike` by injecting the `$options: "i"` regex flag for case-insensitivity.
 * - Attempts to cast stringified date values into real Javascript `Date` objects.
 * - Applies custom field mapping using the provided `apiToDBMap`.
 */
@Injectable()
export class WherePipe<T = unknown> extends FilterPipeAbstract<T> {
  private readonly replaceOperatorsMap = {
    inq: "$in",
    nin: "$nin",
    and: "$and",
    or: "$or",
    like: "$regex",
    ilike: "$regex",
    gte: "$gte",
    lte: "$lte",
    gt: "$gt",
    lt: "$lt",
  };

  applyTransform(value: unknown): unknown {
    return FilterPipeAbstract.transformDeep(value, {
      funcMap: {
        ilike: (val: unknown, par: unknown) => {
          const p = par as Record<string, unknown>;
          p["$options"] = "i";
          return val;
        },
      },
      valueFn: (val: unknown) => {
        if (typeof val !== "string") return val;
        const dateFromString = new Date(val);
        return isNaN(dateFromString.getTime()) ? val : dateFromString;
      },
      keyMap: { ...this.replaceOperatorsMap, ...this.apiToDBMap },
    });
  }
}

/**
 * @class FieldsPipe
 * @description
 * Transforms requested API fields into a format suitable for database projection.
 * - Supports "Object-style" fields (e.g., `{ name: true, email: false }`) by filtering for truthy values.
 * - Supports "Array-style" fields (e.g., `['name', 'email']`).
 * - Maps API-exposed field names to internal database column names using `apiToDBMap`.
 */
@Injectable()
export class FieldsPipe<T = unknown> extends FilterPipeAbstract<T> {
  private readonly allowObjectFields: boolean;

  constructor({
    apiToDBMap = {},
    allowObjectFields = true,
  }: {
    apiToDBMap?: Record<string, string>;
    allowObjectFields?: boolean;
  } = {}) {
    super({ apiToDBMap });
    this.allowObjectFields = allowObjectFields;
  }

  applyTransform(value: unknown) {
    if (this.allowObjectFields && isPlainObject(value)) {
      const fields = mapKeys(value as object, (_, key) =>
        get(this.apiToDBMap, key, key),
      );
      return normalizeProjection(fields);
    }
    if (Array.isArray(value))
      return value.map((key) => get(this.apiToDBMap, key, key));
    return value;
  }
}

/**
 * @class OrderPipe
 * @description
 * Converts API sort/order parameters into database-compatible sorting strings or arrays.
 * - Parses colon-delimited strings (e.g., "createdAt:desc") into mapped field/direction pairs.
 * - Ensures a default "asc" direction if none is provided.
 * - Recursively renames sort keys based on the provided `apiToDBMap`.
 */
@Injectable()
export class OrderPipe<T = unknown> extends FilterPipeAbstract<T> {
  applyTransform(value: unknown) {
    return FilterPipeAbstract.transformDeep(value, {
      funcMap: {
        order: (val: unknown) => {
          const isArray = Array.isArray(val);
          const order = (isArray ? val : [val]).reduce((acc, orderValue) => {
            const [field, direction] = (orderValue as string).split(":");
            return acc.concat(
              `${get(this.apiToDBMap, field, field)}:${direction ?? "asc"}`,
            );
          }, [] as string[]);
          return isArray ? order : order[0];
        },
      },
    });
  }
}

/**
 * @class FilterPipe
 * @description
 * The aggregate pipe that orchestrates the transformation of a full query object by targeting
 * specific top-level properties: `where`, `order` (limits), and `fields`.
 * - Combines `WherePipe`, `FieldsPipe`, and `OrderPipe` into a single transformation flow.
 * - Dynamically enables optional sub-pipes (fields, limits/order) based on constructor configuration.
 * - Recursively processes the "where" block of a query while maintaining the overall object structure.
 */
@Injectable()
export class FilterPipe<T = unknown> extends FilterPipeAbstract<T> {
  private wherePipe: WherePipe<T>;
  private optionalPipes: {
    fields?: (value: unknown) => unknown;
    limits?: (value: unknown) => unknown;
  } = {};

  constructor({
    allowObjectFields = true,
    apiToDBMap = {},
  }: {
    allowObjectFields?: boolean;
    apiToDBMap?: Record<string, string>;
  } = {}) {
    super({ apiToDBMap });
    this.wherePipe = new WherePipe({ apiToDBMap });
    if (allowObjectFields || !isEmpty(apiToDBMap)) {
      const fieldPipe = new FieldsPipe({ apiToDBMap, allowObjectFields });
      this.optionalPipes.fields = (val: unknown) =>
        fieldPipe.applyTransform(val);
    }
    if (!isEmpty(apiToDBMap)) {
      const orderPipe = new OrderPipe({ apiToDBMap });
      this.optionalPipes.limits = (val: unknown) =>
        orderPipe.applyTransform(val);
    }
  }

  applyTransform(value: unknown): unknown {
    return FilterPipeAbstract.transformDeep(value, {
      funcMap: {
        where: (val) => this.wherePipe.applyTransform(val),
        ...this.optionalPipes,
      },
    });
  }
}
