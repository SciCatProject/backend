/**
 * Handlebar helper functions.
 *
 * Helpers should be registered in app.module.ts
 */
import * as hb from "handlebars";
import { JobClass } from "src/jobs/schemas/job.schema";
import { JobParams } from "src/jobs/types/job-types.enum";
import { FormatOptions, unit } from "mathjs";
import { HelperOptions } from "handlebars";
import { parseBoolean } from "./utils";

/**
 * Convert json objects to HTML
 *
 * Supports:
 * - boolean, numbers, and strings without modification
 * - Arrays as <ul>
 * - Objects as key: value pairs separated by <br/>
 * - null as "Not specified"
 * @param json
 * @returns
 */
export const unwrapJSON = (json: unknown): string | number => {
  if (json === null) {
    return "Not specified";
  }
  if (typeof json === "boolean") {
    return json ? "Yes" : "No";
  }
  if (typeof json === "number" || typeof json === "string") {
    return json;
  }
  if (Array.isArray(json)) {
    return (
      "<ul style='padding-left: 1em'>" +
      json
        .map(
          (elem) =>
            "<li style='margin-bottom: 1em'>" + unwrapJSON(elem) + "</li>",
        )
        .join("") +
      "</ul>"
    );
  }
  if (typeof json === "object") {
    // Not json, but some documents parse date strings
    if (json instanceof Date) {
      return (json as Date).toISOString();
    }
    // plain old object
    return Object.keys(json as Record<string, unknown>)
      .map((key) => {
        return (
          formatCamelCase(key) +
          ": " +
          unwrapJSON(json[key as keyof typeof json])
        );
      })
      .join("<br/>");
  }
  return "Not specified";
};

export const formatCamelCase = (camelCase: string): string => {
  const match = camelCase.replace(/([A-Z])/g, " $1");
  const words = match.charAt(0).toUpperCase() + match.slice(1);
  return words;
};

/**
 * Convert a handlebars context to a json string
 *
 * Useful for debugging, eg "{{{jsonify this}}}". Results contain newlines.
 * @param context Handlebars variable
 * @returns string
 */
export const jsonify = (context: unknown): string => {
  return JSON.stringify(context, null, 3);
};

type DatasetIdV3 = {
  pid: string;
  files: string[];
};
interface JobV3 {
  id: string;
  emailJobInitiator?: string;
  type: string;
  creationTime: Date;
  executionTime?: Date;
  jobParams: Record<string, unknown>;
  jobStatusMessage?: string;
  datasetList: DatasetIdV3[];
  jobResultObject?: unknown;
}

/**
 * Convert a current job to follow the old v3 schema.
 *
 * Useful as a shim for backwards compatibility with old archive systems.
 *
 * Example: '{{{ jsonify (job_v3 this) }}}'
 * @param context
 */
export const job_v3 = (job: JobClass): JobV3 => {
  let datasetList: DatasetIdV3[] = [];
  if (JobParams.DatasetList in job.jobParams) {
    datasetList = job.jobParams[JobParams.DatasetList] as DatasetIdV3[];
  }
  return {
    id: job.id || job._id,
    emailJobInitiator: job.contactEmail,
    type: job.type,
    creationTime: job.createdAt,
    jobParams: {
      ...job.jobParams,
      username: job.createdBy,
    },
    // v3 statusMessages were generally concise, so use the statusCode
    jobStatusMessage: job.statusCode,
    datasetList: datasetList,
  };
};

/**
 * URL encode input
 * @param context Handlebars variable
 * @returns URL-encoded string
 */
export const urlencode = (context: string): string => {
  return encodeURIComponent(context);
};

/**
 * Format a unit using mathjs.
 *
 * Additional formatting options can be passed as named parameters (eg changing
 * precision from the default of 2). See
 * [mathjs format docs](https://mathjs.org/docs/reference/functions/format.html)
 *
 * Example:
 *   `{{formatUnit 52428800 "B" precision=1}}` produces `50 MiB`
 *
 * @param value numeric value
 * @param baseUnit string representing the unit
 * @param options handlebar options object; collects named parameters in `hash`
 * @returns
 */
export const formatUnit = (
  value: number,
  baseUnit: string,
  options: HelperOptions,
) => {
  const u = unit(value, baseUnit);
  const fmtOptions: FormatOptions = {
    precision: 2,
    ...options.hash,
  };
  return u.format(fmtOptions);
};

/**
 * Base64 encode input
 * @param context Handlebars variable
 * @returns URL-encoded string
 */
export const base64enc = (context: string): string => {
  return btoa(context);
};

export function regexMatches(
  query: string,
  regex: string,
  ...args: unknown[]
): boolean {
  args.pop() as HelperOptions; // Remove options
  const flags = args.pop() as string | undefined;
  return RegExp(regex, flags).test(query);
}
export const handlebarsHelpers: hb.HelperDeclareSpec = {
  unwrapJSON: unwrapJSON,
  keyToWord: formatCamelCase,
  eq: (a: unknown, b: unknown) => a === b,
  or: (...args) => args.slice(0, -1).some((arg) => parseBoolean(arg)),
  and: (...args) => args.slice(0, -1).every((arg) => parseBoolean(arg)),
  not: (a: unknown) => !parseBoolean(a),
  concat: (...args: unknown[]) => args.slice(0, -1).join(""),
  matches: regexMatches,
  default: (query: unknown, def: unknown) => query || def,
  jsonify: jsonify,
  job_v3: job_v3,
  urlencode: urlencode,
  base64enc: base64enc,
  base64dec: atob,
  formatUnit: formatUnit,
};
