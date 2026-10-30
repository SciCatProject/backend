import { BadRequestException } from "@nestjs/common";
import { MAX_QUERY_JSON_LENGTH, parseSafeJson } from "src/common/safe-json";

const MAX_REGEX_LENGTH = 256;

const ALLOWED_MONGO_OPERATORS = new Set([
  "$in",
  "$or",
  "$and",
  "$nor",
  "$eq",
  "$gt",
  "$gte",
  "$lt",
  "$lte",
  "$ne",
  "$nin",
  "$not",
  "$exists",
  "$regex",
  "$options",
]);

function validateMongoFilter(value: unknown, parameterName: string): void {
  if (value === null || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((item) => validateMongoFilter(item, parameterName));
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (
      (parameterName === "filter" || parameterName === "filters") &&
      key.startsWith("$") &&
      !ALLOWED_MONGO_OPERATORS.has(key)
    ) {
      throw new BadRequestException(`MongoDB operator '${key}' is not allowed`);
    }
    if (key === "$regex" && typeof child === "string") {
      if (child.length > MAX_REGEX_LENGTH) {
        throw new BadRequestException(
          `Regular expressions in '${parameterName}' are too long`,
        );
      }
    }
    validateMongoFilter(child, parameterName);
  }
}

/**
 * Parse and validate JSON supplied through a Proposal V4 query parameter.
 * The common parser applies size/depth/complexity limits; this wrapper adds
 * Proposal API MongoDB operator and regular-expression restrictions.
 */
export function parseProposalV4Json<T>(
  value: string | undefined,
  fallback: T,
  parameterName: string,
): T {
  const parsed = parseSafeJson(value, fallback, parameterName);
  if (value && value.length <= MAX_QUERY_JSON_LENGTH) {
    validateMongoFilter(parsed, parameterName);
  }
  return parsed;
}
