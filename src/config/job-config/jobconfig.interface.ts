import { CreateJobDto } from "../../jobs/dto/create-job.dto";
import { UpdateJobDto } from "../../jobs/dto/update-job.dto";
import { JobsAuth } from "../../jobs/types/jobs-auth.enum";
import { JobClass } from "../../jobs/schemas/job.schema";
import { DatasetClass } from "../../datasets/schemas/dataset.schema";
import { makeHttpException } from "src/common/utils";
import { HttpException } from "@nestjs/common";

// Nest Token for CREATE job actions
export const CREATE_JOB_ACTION_CREATORS = Symbol("CREATE_JOB_ACTION_CREATORS");
// Nest Token for UPDATE job actions
export const UPDATE_JOB_ACTION_CREATORS = Symbol("UPDATE_JOB_ACTION_CREATORS");

export interface JobConfigListOptions {
  configVersion: string;
  jobs: JobConfigOptions[];
}

/**
 * Encapsulates all responses to a particular job type (eg "archive")
 */
export interface JobConfig {
  jobType: string;
  configVersion: string;
  create: JobOperation<CreateJobDto>;
  update: JobOperation<UpdateJobDto>;
}
export interface JobConfigOptions {
  jobType: string;
  configVersion: string;
  create: JobOperationOptions;
  update: JobOperationOptions;
}

export type JobDto = CreateJobDto | UpdateJobDto;
/**
 * Encapsulates all information for a particular job operation (eg "create", "update")
 */
export interface JobOperation<DtoType extends JobDto> {
  auth: JobsAuth;
  actions: JobAction<DtoType>[];
}
export interface JobOperationOptions {
  auth: JobsAuth;
  actions?: JobActionOptions[];
}

/**
 * Encapsulates the data available to jobs during the validation phase
 */
export interface JobValidateContext<DtoType extends JobDto> {
  request: DtoType;
  job?: JobClass; // Either the previous value (validate) or the new value (perform)
  datasets: DatasetClass[]; // Should be set lazily when needed
  env: Record<string, string | undefined>;
}
/**
 * Encapsulates the data available to jobs during the perform phase
 */
export interface JobPerformContext<
  DtoType extends JobDto,
> extends JobValidateContext<DtoType> {
  job: JobClass;
}

export type JobTemplateContext =
  JobValidateContext<JobDto> | JobPerformContext<JobDto>;

/**
 * Superclass for all responses to Job changes
 */
export interface JobAction<DtoType extends JobDto> {
  /**
   * Validate that the request body for this job operation.
   *
   * Note that the configuration of this action is validated in the constructor.
   * Actions that don't need custom DTO methods can omit this method.
   *
   * @param context data transfer object received from the client
   * @throw HttpException if the DTO is invalid
   * @returns
   */
  validate?: (context: JobValidateContext<DtoType>) => Promise<void>;

  /**
   * Respond to the action
   */
  perform: (context: JobPerformContext<DtoType>) => Promise<void>;

  /**
   * Return the actionType for this action. This should match the class's
   * static actionType (used for constructing the class from the configuration file)
   */
  getActionType(): string;
}

export interface JobActionOptions {
  actionType: string;
}

/**
 * Represents a class that can create a JobAction after reading the jobConfigurationFile
 */
export type JobActionCreator<DtoType extends JobDto> = {
  create: (options: JobActionOptions) => JobAction<DtoType>;
};

/**
 * Validate the DTO against a list of actions.
 *
 * Validation is performed in parallel. Invalid DTOs will result in an HTTPException.
 * @param actions
 * @param context
 * @returns
 */
export async function validateActions<DtoType extends JobDto>(
  actions: JobAction<DtoType>[],
  context: JobValidateContext<DtoType>,
): Promise<void> {
  await Promise.all(
    actions.map((action) => {
      if (action.validate) {
        return action.validate(context).catch((err: Error) => {
          if (err instanceof HttpException) {
            throw err;
          }
          makeHttpException(
            `Invalid job input. Invalid request body for '${action.getActionType()}' due to ${err}`,
          );
        });
      } else {
        return Promise.resolve();
      }
    }),
  );
}

/**
 * Perform all actions serially.
 *
 * Actions should throw a HTTPException for most errors. Other exceptions will be converted to HTTPExceptions, resulting
 * in a 400 response.
 * @param actions List of actions to perform
 * @param context
 * @returns
 */
export async function performActions<DtoType extends JobDto>(
  actions: JobAction<DtoType>[],
  context: JobPerformContext<DtoType>,
): Promise<void> {
  for (const action of actions) {
    await action.perform(context).catch((err: Error) => {
      if (err instanceof HttpException) {
        throw err;
      }
      throw makeHttpException(
        `Invalid job input. Job '${context.job.type}' unable to perform action '${action.getActionType()}' due to ${err}`,
      );
    });
  }
}
