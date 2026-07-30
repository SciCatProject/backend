import { JobActionOptions } from "../../jobconfig.interface";

export const actionType = "switch";

export enum SwitchPhase {
  Validate = "validate",
  Perform = "perform",
  All = "all",
}

export interface SwitchJobActionOptions extends JobActionOptions {
  actionType: typeof actionType;
  phase: SwitchPhase;
  property: string;
  cases: CaseOptions[];
}

export type CaseOptions =
  DefaultCaseOptions | SwitchCaseOptions | MatchCaseOptions | RegexCaseOptions;

export interface DefaultCaseOptions {
  actions: JobActionOptions[];
}
export interface SwitchCaseOptions extends DefaultCaseOptions {
  schema: object;
}
export interface MatchCaseOptions extends DefaultCaseOptions {
  match: string | number | boolean | null;
}
export interface RegexCaseOptions extends DefaultCaseOptions {
  regex: string;
}

/**
 * Type guard for SwitchJobActionOptions
 * Ensures all required fields are present, types are correct, and no extra fields exist.
 */
export function isSwitchJobActionOptions(
  options: unknown,
): options is SwitchJobActionOptions {
  if (typeof options !== "object" || options === null) return false;

  const allowedKeys = ["actionType", "phase", "property", "cases"];
  const opts = options as Record<string, unknown>;
  const keys = Object.keys(opts);

  // Check for extra fields
  if (!keys.every((key) => allowedKeys.includes(key))) return false;

  // Check required fields
  if (
    opts.actionType !== actionType ||
    typeof opts.phase !== "string" ||
    !Object.values(SwitchPhase).includes(opts.phase as SwitchPhase) ||
    typeof opts.property !== "string" ||
    !Array.isArray(opts.cases) ||
    !opts.cases.every(isCaseOptions)
  ) {
    return false;
  }

  return true;
}

/**
 * Type guard for CaseOptions
 */
export function isCaseOptions(options: unknown): options is CaseOptions {
  if (typeof options !== "object" || options === null) {
    return false;
  }

  const opts = options as CaseOptions;
  return Array.isArray(opts.actions);
}
