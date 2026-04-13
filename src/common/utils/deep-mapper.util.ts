import { get } from "lodash";

function mapDeep<T, U>(
  source: T,
  key: keyof U | string,
  fieldsMap: Record<keyof U, keyof T | string>,
): T[keyof T] | unknown | null {
  if (!source) return null;
  if (get(source, key)) return get(source, key);
  const keysList = (fieldsMap[key] as string).split(".");
  const initialValue = get(source, keysList[0]);
  return keysList.slice(1).reduce((acc, currKey) => {
    if (Array.isArray(acc)) {
      return acc.map((item) => get(item, currKey));
    }
    return get(acc, currKey);
  }, initialValue);
}

export function createDeepMapper<T, U>(
  fieldsMap: Record<keyof U, keyof T | string>,
) {
  return (source: T, key: keyof U | string) => {
    return mapDeep<T, U>(source, key, fieldsMap);
  };
}
