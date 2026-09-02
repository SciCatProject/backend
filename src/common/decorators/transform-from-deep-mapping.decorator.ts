import { Transform } from "class-transformer";
import { createDeepMapper, PathSpec } from "../utils/deep-mapper.util";

export function TransformFromDeepMapping<T, U>(
  fieldsMap: Partial<Record<keyof U & string, PathSpec>>,
  defaultValue?: unknown,
) {
  const mapper = createDeepMapper<T, U>(fieldsMap);
  return Transform(
    ({ obj, key }: { obj: T; key: string }) => mapper(obj, key) ?? defaultValue,
    { toClassOnly: true },
  );
}
