import { get, mapValues, merge, set } from "lodash";

type MappingFn<S> = (source: S) => unknown;

export interface PathSpec {
  readonly path: readonly string[];
  readonly arrayItemPath?: readonly string[];
}

class PathBuilder implements PathSpec {
  constructor(
    readonly path: readonly string[],
    readonly arrayItemPath?: readonly string[],
  ) {}

  eachItem(itemDotPath: string): PathSpec {
    return new PathBuilder(this.path, itemDotPath.split("."));
  }
}

export function path(dotPath: string): PathBuilder {
  return new PathBuilder(dotPath.split("."));
}

export type FieldsMap<S> = Partial<
  Record<keyof S & string, PathSpec | MappingFn<S>>
>;

function getDeep<T, U>(
  source: T,
  key: keyof U & string,
  fieldsMap: Partial<Record<keyof U & string, PathSpec>>,
): T[keyof T] | unknown | null {
  if (!source) return null;
  const spec = fieldsMap[key];
  if (!spec) return get(source, key);
  if (!spec.arrayItemPath) return get(source, spec.path as string[]);
  const items = get(source, spec.path as string[]) as unknown[] | undefined;
  if (!items) return undefined;
  return items.map((item) => get(item, spec.arrayItemPath as string[]));
}

export function createDeepMapper<T, U>(
  fieldsMap: Partial<Record<keyof U & string, PathSpec>>,
) {
  return (source: T, key: string) => {
    return getDeep<T, U>(source, key as keyof U & string, fieldsMap);
  };
}

function isPathSpec(value: unknown): value is PathSpec {
  return !!value && typeof value === "object" && "path" in value;
}

function setDeep<S>(
  source: S,
  key: keyof S & string,
  fieldsMap: FieldsMap<S>,
): Record<string, unknown> {
  if (!source) return {};
  const instruction = fieldsMap[key];
  if (typeof instruction === "function") return { [key]: instruction(source) };
  const spec: PathSpec = isPathSpec(instruction)
    ? instruction
    : { path: [key] };
  const value = get(source, key);
  if (value === undefined) return {};
  const fragment = {};
  if (!spec.arrayItemPath) return set(fragment, spec.path as string[], value);

  const arrayResult: Record<string, unknown>[] = [];
  if (Array.isArray(value))
    value.forEach((itemValue, index) => {
      arrayResult[index] = {};
      set(arrayResult[index], spec.arrayItemPath as string[], itemValue);
    });
  else {
    arrayResult[0] = {};
    set(arrayResult[0], spec.arrayItemPath as string[], value);
  }
  return set(fragment, spec.path as string[], arrayResult);
}

export function createDeepSetter<S, T>(fieldsMap: FieldsMap<S>) {
  return (source: S): T =>
    Object.keys(source as keyof S).reduce((acc, key) => {
      const fragment = setDeep<S>(source, key as keyof S & string, fieldsMap);
      return merge(acc, fragment);
    }, {}) as T;
}

export function toApiToDBMap<K extends string>(
  fieldsMap: Partial<Record<K, PathSpec>>,
): { apiToDBMap: Record<K, string> } {
  return {
    apiToDBMap: mapValues(fieldsMap, (spec) =>
      spec ? [...spec.path, ...(spec.arrayItemPath ?? [])].join(".") : spec,
    ) as Record<K, string>,
  };
}
