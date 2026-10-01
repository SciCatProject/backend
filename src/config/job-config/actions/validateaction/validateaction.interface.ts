import { JobActionOptions } from "../../jobconfig.interface";

export const actionType = "validate";

export interface ValidateJobActionOptions extends JobActionOptions {
  actionType: typeof actionType;
  request?: Record<string, unknown>;
}

export interface ValidateCreateJobActionOptions extends ValidateJobActionOptions {
  actionType: typeof actionType;
  request?: Record<string, unknown>;
  datasets?: Record<string, unknown>;
}

/**
 * Type guard for EmailJobActionOptions
 */
export function isValidateJobActionOptions(
  options: unknown,
): options is ValidateJobActionOptions {
  if (typeof options === "object" && options !== null) {
    const opts = options as ValidateJobActionOptions;
    return (
      opts.actionType === actionType &&
      (opts.request === undefined || typeof opts.request === "object")
    );
  }
  return false;
}

/**
 * Type guard for EmailJobActionOptions
 */
export function isValidateCreateJobActionOptions(
  options: unknown,
): options is ValidateJobActionOptions {
  if (typeof options === "object" && options !== null) {
    const opts = options as ValidateCreateJobActionOptions;
    return (
      opts.actionType === actionType &&
      (opts.request === undefined || typeof opts.request === "object") &&
      (opts.datasets === undefined || typeof opts.datasets === "object")
    );
  }
  return false;
}
