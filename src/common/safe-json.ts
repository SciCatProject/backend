import { BadRequestException } from "@nestjs/common";

export const MAX_QUERY_JSON_LENGTH = 64 * 1024;
const MAX_QUERY_JSON_DEPTH = 12;
const MAX_QUERY_JSON_NODES = 500;
const MAX_QUERY_JSON_ARRAY_LENGTH = 100;

function validateShape(
  value: unknown,
  parameterName: string,
  depth = 0,
  state = { nodes: 0 },
): void {
  state.nodes += 1;
  if (state.nodes > MAX_QUERY_JSON_NODES) {
    throw new BadRequestException(
      `Query parameter '${parameterName}' is too complex`,
    );
  }
  if (depth > MAX_QUERY_JSON_DEPTH) {
    throw new BadRequestException(
      `Query parameter '${parameterName}' is nested too deeply`,
    );
  }
  if (value === null || typeof value !== "object") return;

  if (Array.isArray(value)) {
    if (value.length > MAX_QUERY_JSON_ARRAY_LENGTH) {
      throw new BadRequestException(
        `Query parameter '${parameterName}' contains too many array items`,
      );
    }
    value.forEach((item) =>
      validateShape(item, parameterName, depth + 1, state),
    );
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (["__proto__", "prototype", "constructor"].includes(key)) {
      throw new BadRequestException(
        `Query parameter '${parameterName}' contains a forbidden property`,
      );
    }
    validateShape(child, parameterName, depth + 1, state);
  }
}

export function parseSafeJson<T>(
  value: string | undefined,
  fallback: T,
  parameterName: string,
): T {
  if (!value) return fallback;
  if (value.length > MAX_QUERY_JSON_LENGTH) {
    throw new BadRequestException(
      `Query parameter '${parameterName}' is too large`,
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new BadRequestException(
      `Invalid JSON supplied for query parameter '${parameterName}'`,
    );
  }
  validateShape(parsed, parameterName);
  return parsed as T;
}
