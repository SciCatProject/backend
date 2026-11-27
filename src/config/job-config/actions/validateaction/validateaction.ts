import {
  JobAction,
  JobDto,
  JobValidateContext,
  JobPerformContext,
} from "../../jobconfig.interface";
import { JSONPath } from "jsonpath-plus";
import Ajv, { ValidateFunction } from "ajv";
import {
  actionType,
  ValidateCreateJobActionOptions,
  ValidateJobActionOptions,
} from "./validateaction.interface";
import { CreateJobDto } from "src/jobs/dto/create-job.dto";
import { toObject, HasToObject, JSONData } from "../actionutils";
import { makeHttpException } from "src/common/utils";
import { JobParams } from "src/jobs/types/job-types.enum";

/**
 * Validates the job for the presence of required fields. Can also check types or
 * validate against a JSON Schema.
 *
 * The config file for a validate action will look like this:
 *
 * <pre>
 * actionType: validate
 * request:
 *   path: typecheck
 * </pre>
 *
 * Usually `path` will be a dot-delimited field in the DTO, eg. "jobParams.name".
 * Technically it is a JSONPath-Plus expression; see
 * https://github.com/JSONPath-Plus/JSONPath.
 *
 * Here are some example typecheck expressions:
 * <pre>
 * actionType: validate
 * request:
 *   name:
 *     type: string
 *   answers[*]:
 *     enum: ["yes", "no" ]
 *   metadata:
 *     "$ref": https://json.schemastore.org/schema-org-thing.json
 * </pre>
 *
 * This base class includes only the `request` field, which validates the request body
 * received from the client (aka the DTO). It is intended for the `update` job
 * operation.
 *
 * ValidateCreateAction extends this with an additional `datasets` field, which works
 * identically to `request` but is applied to any datasets mentioned in
 * `jobParams.datasetList`. This is used for the `create` job operation.
 */
export class ValidateJobAction<T extends JobDto> implements JobAction<T> {
  private request: Record<string, ValidateFunction>;

  getActionType(): string {
    return actionType;
  }

  constructor(options: ValidateJobActionOptions, ajv?: Ajv) {
    ajv =
      ajv ||
      new Ajv({
        strictSchema: false,
        strictTypes: false,
      });
    if ("request" in options) {
      const request = options.request || {};
      this.request = this.compileSchemas(ajv, request);
    }
  }

  /**
   * Compiles JSON schemas from the config file into Ajv validators
   *
   * @param ajv Ajv instance
   * @param schemasMap An object mapping a JSON Path (as a string) to a JSON schema (an object)
   */
  protected compileSchemas(
    ajv: Ajv,
    schemasMap: Record<string, unknown>,
  ): Record<string, ValidateFunction> {
    return Object.fromEntries(
      Object.entries(schemasMap).map(([path, schema]) => {
        if (typeof schema !== "object" || schema === null) {
          throw new Error("Schema must be a valid object.");
        }

        return [path, ajv.compile(schema)];
      }),
    );
  }

  /**
   * Validate the current request
   * @param dto Job DTO
   */
  async validate(context: JobValidateContext<T>) {
    if (this.request) {
      // validate request body
      this.validateJson(context.request, this.request);
    }
  }

  /**
   * Perform the actual validation.
   *
   * This should be called by `validate` with the correct data to be validated
   * @param json object to validate against (Job, Dataset, etc)
   * @param schemaMap An object mapping a JSON Path (as a string) to a JSON schema (an object)
   */
  protected validateJson(
    json: JSONData | HasToObject,
    schemaMap: Record<string, ValidateFunction>,
  ) {
    // Convert Documents to plain objects if needed
    json = toObject(json);

    for (const [path, schema] of Object.entries(schemaMap)) {
      // Compile the key to a JSONPath and apply it to the json data
      const result = JSONPath({ path, json }) as JSONData[];
      if (result !== null && result?.length > 0) {
        result.forEach((entry) => {
          // check each result against the Ajv schema
          if (!schema(entry)) {
            throw makeHttpException(
              `Invalid request. Invalid value for '${path}'`,
            );
          }
        });
      } else {
        throw makeHttpException(`Invalid request. Requires '${path}'`);
      }
    }
  }

  /**
   * Does nothing (validate only)
   * @param job Ignored
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async perform(context: JobPerformContext<T>) {}
}

/**
 * Validates a request to create a new job for the presence of required fields. Can
 * check types or validate against a JSON Schema.
 *
 * The config file for a validate action will look like this:
 *
 * <pre>
 * actionType: validate
 * request:
 *   path: typecheck
 * datasets:
 *   path: typecheck
 * </pre>
 *
 * The constraints in the 'datasets' section are applied to all datasets listed in the
 * `jobParams.datasetList` array. Since the dataset list needs to be set at job
 * creation, this form of the action is only applicable to the `CreateJobDto` and cannot
 * be included during an update operation.
 *
 * Invalid request constraints result in a 400 error, while invalid dataset constraints
 * return a 409 error.
 *
 * See ValidateAction for more information about the form of `path` and `typecheck`.
 */
export class ValidateCreateJobAction extends ValidateJobAction<CreateJobDto> {
  private datasets?: Record<string, ValidateFunction>;

  constructor(options: ValidateCreateJobActionOptions, ajv?: Ajv) {
    ajv =
      ajv ||
      new Ajv({
        strictSchema: false,
        strictTypes: false,
      });
    super(options, ajv);
    if ("datasets" in options) {
      const datasets = options.datasets || {};
      this.datasets = this.compileSchemas(ajv, datasets);
    }
  }

  /**
   * Validate the current request
   *
   * Validates the Job request and the datasets
   * @param dto Job DTO
   */
  async validate(context: JobValidateContext<CreateJobDto>): Promise<void> {
    // Validate this.requests
    await super.validate(context);

    // Validate this.datasets. Requires datasets to be present.
    if (!this.datasets) {
      return;
    }

    if (!context.datasets || context.datasets.length == 0) {
      throw makeHttpException(
        `'jobParams.${JobParams.DatasetList}' is required.`,
      );
    }

    // Validate this.datasets
    await Promise.all(
      context.datasets.map((dataset) =>
        this.validateJson(dataset, this.datasets!),
      ),
    );
  }
}
