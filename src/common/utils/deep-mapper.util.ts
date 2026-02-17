import { get, trim } from "lodash";

function mapDeep<T, U>(
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
    return mapDeep<T, U>(source, key as keyof U & string, fieldsMap);
  };
}
