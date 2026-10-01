import * as hb from "handlebars";
import { JobTemplateContext } from "./jobconfig.interface";
import { handlebarsHelpers } from "src/common/handlebars-helpers";

export type TemplateJob = hb.TemplateDelegate<JobTemplateContext>;

/**
 * Register all standard handlebars helpers
 *
 * This is normally handled by app.module.ts, but may need to be called manually by
 * tests that bypass module loading.
 */
export function registerHelpers() {
  hb.registerHelper(handlebarsHelpers);
}

/**
 * Standardizes compilation of handlebars templates
 *
 * This should be used by all actions rather than calling handlebars.compile directly.
 * @param input
 * @param options
 * @returns
 */
export function compileJobTemplate(
  input: unknown,
  options?: CompileOptions,
): TemplateJob {
  const template: TemplateJob = hb.compile<JobTemplateContext>(input, options);
  return (context: JobTemplateContext, options?: RuntimeOptions) => {
    return template(context, {
      ...options,
    });
  };
}
