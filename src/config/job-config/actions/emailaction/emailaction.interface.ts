import { JobActionOptions } from "../../jobconfig.interface";

export const actionType = "email";

export interface EmailJobActionOptions extends JobActionOptions {
  actionType: typeof actionType;
  /**
   * Handlebars template for the recipient address(es). Combined with the
   * policy managers when toPolicyManagers is also set - at least one of
   * the two must be set.
   */
  to?: string;
  /**
   * Append the Policy.manager emails for the datasets' ownerGroup to the
   * recipients. At least one of "to"/toPolicyManagers must be set.
   */
  toPolicyManagers?: boolean;
  from?: string;
  subject: string;
  bodyTemplateFile: string;
  ignoreErrors?: boolean;
}

/**
 * Type guard for EmailJobActionOptions
 */
export function isEmailJobActionOptions(
  options: unknown,
): options is EmailJobActionOptions {
  if (typeof options !== "object" || options === null) {
    return false;
  }

  const opts = options as EmailJobActionOptions;
  const hasTo = typeof opts.to === "string" && opts.to.length > 0;
  const hasToPolicyManagers = opts.toPolicyManagers === true;
  return (
    opts.actionType === actionType &&
    (hasTo || hasToPolicyManagers) &&
    (opts.from === undefined || typeof opts.from === "string") &&
    typeof opts.subject === "string" &&
    typeof opts.bodyTemplateFile === "string" &&
    (opts.ignoreErrors === undefined || typeof opts.ignoreErrors === "boolean")
  );
}
