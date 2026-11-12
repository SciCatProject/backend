import { FilterQuery } from "mongoose";
import { AMBIGUOUS_TYPE_FIELD_MAP } from "../dto/policy.obsolete.dto";
import { PolicyDocument } from "../schemas/policy.schema";

const LIVE_ONLY: FilterQuery<PolicyDocument> = {
  supersededBy: { $exists: false },
};

// Excludes documents superseded by a data-repair process (see
// Policy.supersededBy) - callers should only ever see the one live
// document per (ownerGroup, type). Shared by PoliciesService and
// PoliciesV4Service.
export function liveFilter(
  filter: FilterQuery<PolicyDocument>,
): FilterQuery<PolicyDocument> {
  return { ...filter, ...LIVE_ONLY };
}

// Turns a nested object into Mongo dot-path leaf keys (e.g.
// {policyParams: {tapeRedundancy: "low"}} -> {"policyParams.tapeRedundancy": "low"}),
// so a $set doesn't clobber the untouched siblings of a nested object.
// Arrays are left as leaf values, not recursed into.
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

const LOGICAL_WHERE_OPERATORS = new Set(["$and", "$or", "$nor"]);

// Rewrites a v3 `where` filter to target the pseudo-documents built by
// PoliciesService.buildOwnerGroupGroupingStages, instead of a single
// archive/retrieve document - otherwise a filter spanning both types could
// never match a single document, even though the merged resource does.
// Fields in AMBIGUOUS_TYPE_FIELD_MAP route to their own side's pseudo-doc
// instead of `merged`, since both sides would collide onto the same
// merged property otherwise. Logical operators are recursed into.
export function prefixMergedFilterFields(
  filter: FilterQuery<PolicyDocument>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(filter)) {
    if (LOGICAL_WHERE_OPERATORS.has(key) && Array.isArray(value)) {
      result[key] = value.map((clause) =>
        prefixMergedFilterFields(clause as FilterQuery<PolicyDocument>),
      );
      continue;
    }
    const ambiguous = AMBIGUOUS_TYPE_FIELD_MAP[key];
    if (ambiguous) {
      result[`${ambiguous.type}Doc.${ambiguous.path}`] = value;
    } else {
      result[`merged.${key}`] = value;
    }
  }
  return result;
}

// Same per-field routing as prefixMergedFilterFields, for a single sort
// field rather than a whole filter - used to read the group's sort value
// off the right pseudo-document (see findMergedPolicies).
export function mergedSortFieldPath(sortField: string): string {
  const ambiguous = AMBIGUOUS_TYPE_FIELD_MAP[sortField];
  return ambiguous
    ? `${ambiguous.type}Doc.${ambiguous.path}`
    : `merged.${sortField}`;
}
