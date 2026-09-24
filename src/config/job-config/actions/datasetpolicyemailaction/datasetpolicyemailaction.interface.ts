import { JobActionOptions } from "../../jobconfig.interface";

export const actionType = "datasetPolicyEmail";

export interface DatasetPolicyEmailJobActionOptions extends JobActionOptions {
  actionType: typeof actionType;
  from?: string;
  subject: string;
  bodyTemplateFile: string;
  ignoreErrors?: boolean;
}

/**
 * Type guard for DatasetPolicyEmailJobActionOptions
 */
export function isDatasetPolicyEmailJobActionOptions(
  options: unknown,
): options is DatasetPolicyEmailJobActionOptions {
  if (typeof options !== "object" || options === null) {
    return false;
  }

  const opts = options as DatasetPolicyEmailJobActionOptions;
  return (
    opts.actionType === actionType &&
    (opts.from === undefined || typeof opts.from === "string") &&
    typeof opts.subject === "string" &&
    typeof opts.bodyTemplateFile === "string" &&
    (opts.ignoreErrors === undefined || typeof opts.ignoreErrors === "boolean")
  );
}
