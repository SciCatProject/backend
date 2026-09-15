import { FilterQuery } from "mongoose";
import { PolicyDocument } from "../schemas/policy.schema";

const LIVE_ONLY: FilterQuery<PolicyDocument> = {
  supersededBy: { $exists: false },
};

// Excludes documents superseded by a data-repair process (see
// Policy.supersededBy) from a query - callers should only ever see the one
// live document per (ownerGroup, type). Shared by PoliciesService and
// PoliciesV4Service, which each query the Policy collection independently
// but must apply this exact same rule to every live read/write.
export function liveFilter(
  filter: FilterQuery<PolicyDocument>,
): FilterQuery<PolicyDocument> {
  return { ...filter, ...LIVE_ONLY };
}

// Turns a nested object into Mongo dot-path leaf keys (e.g.
// {policyParams: {tapeRedundancy: "low"}} ->
// {"policyParams.tapeRedundancy": "low"}), so a $set doesn't clobber the
// untouched siblings of a nested object. Top-level scalar/array fields come
// out as bare keys, unprefixed. Arrays are left as leaf values, not
// recursed into. Shared by PoliciesService and PoliciesV4Service - both
// PATCH endpoints need this, even though the two persist through separate
// Mongoose model access.
export function flattenToDotPaths(
  obj: Record<string, unknown>,
  prefix = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      Object.assign(
        result,
        flattenToDotPaths(value as Record<string, unknown>, path),
      );
    } else {
      result[path] = value;
    }
  }
  return result;
}
