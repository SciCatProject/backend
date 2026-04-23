import { get, merge, set, trim } from "lodash";

type MappingFn<S> = (source: S) => unknown;

type FieldsMap<S> = Partial<Record<keyof S & string, string | MappingFn<S>>>;

function getDeep<T, U>(
  source: T,
  key: keyof U & string,
  fieldsMap: Partial<Record<keyof U & string, string>>,
): T[keyof T] | unknown | null {
  if (!source) return null;
  if (!fieldsMap[key]) return get(source, key);
  if (get(source, key)) return get(source, key);
  if (!fieldsMap[key].includes("[]")) return get(source, fieldsMap[key]);
  const keysList = fieldsMap[key].split("[]");
  const initialValue = get(source, trim(keysList[0], "."));
  if (!initialValue) return;
  return keysList.slice(1).reduce((acc, currKey) => {
    if (!acc) return acc;
    return acc.map((item: object) => get(item, trim(currKey, ".")));
  }, initialValue);
}

export function createDeepMapper<T, U>(
  fieldsMap: Partial<Record<keyof U & string, string>>,
) {
  return (source: T, key: string) => {
    return getDeep<T, U>(source, key as keyof U & string, fieldsMap);
  };
}

function setDeep<S>(
  source: S,
  key: keyof S & string,
  fieldsMap: FieldsMap<S>,
): Record<string, unknown> {
  if (!source) return {};
  const instruction = fieldsMap[key];
  if (typeof instruction === "function") return { [key]: instruction(source) };
  const path = (instruction as string) || key;
  const value = get(source, key);
  if (value === undefined) return {};
  const fragment = {};
  if (!path.includes("[]")) return set(fragment, path, value);
  const [arrayRootPath, rawLeafPath] = path.split("[]");
  const leafPath = trim(rawLeafPath, ".");
  const arrayResult: Record<string, unknown>[] = [];

  if (Array.isArray(value))
    value.forEach((itemValue, index) => {
      arrayResult[index] = {};
      set(arrayResult[index], leafPath, itemValue);
    });
  else {
    arrayResult[0] = {};
    set(arrayResult[0], leafPath, value);
  }
  return set(fragment, trim(arrayRootPath, "."), arrayResult);
}

export function createDeepSetter<S, T>(fieldsMap: FieldsMap<S>) {
  return (source: S): T =>
    Object.keys(source as keyof S).reduce((acc, key) => {
      const fragment = setDeep<S>(source, key as keyof S & string, fieldsMap);
      return merge(acc, fragment);
    }, {}) as T;
}
