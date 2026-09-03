import { JobActionOptions } from "../../jobconfig.interface";

export const actionType = "groupedEmail";

export interface GroupedEmailJobActionOptions extends JobActionOptions {
  actionType: typeof actionType;
  from?: string;
  subject: string;
  bodyTemplateFile: string;
  ignoreErrors?: boolean;
}

/**
 * Type guard for GroupedEmailJobActionOptions
 */
export function isGroupedEmailJobActionOptions(
  options: unknown,
): options is GroupedEmailJobActionOptions {
  if (typeof options !== "object" || options === null) {
    return false;
  }

  const opts = options as GroupedEmailJobActionOptions;
  return (
    opts.actionType === actionType &&
    (opts.from === undefined || typeof opts.from === "string") &&
    typeof opts.subject === "string" &&
    typeof opts.bodyTemplateFile === "string" &&
    (opts.ignoreErrors === undefined || typeof opts.ignoreErrors === "boolean")
  );
}
