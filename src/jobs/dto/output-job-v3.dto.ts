import { DatasetListDto } from "./dataset-list.dto";
import { Exclude, Expose, Transform } from "class-transformer";
import _ from "lodash";
import { jobV3toV4FieldMap } from "../types/jobs-filter-content";
import { BaseOutputDto } from "src/common/dto/base-output.dto";
import { TransformFromDeepMapping } from "src/common/decorators/transform-from-deep-mapping.decorator";

export class OutputJobV3Dto extends BaseOutputDto {
  // v3 never exposed ownership fields for jobs (unlike Policy/PublishedData) -
  // confirmed by an existing e2e assertion that these must be absent from
  // v3 job responses even though v4 exposes them.
  @Exclude()
  declare ownerGroup: string;

  @Exclude()
  declare accessGroups: string[];

  @Exclude()
  declare instrumentGroup?: string;

  @Exclude()
  declare isPublished: boolean;

  /**
   * The email of the person initiating the job request.
   */
  @Expose()
  @TransformFromDeepMapping(jobV3toV4FieldMap)
  emailJobInitiator?: string;

  /**
   * Type of job, e.g. archive, retrieve etc.
   */
  @Expose()
  type: string;

  /**
   * Time when job is created. Format according to chapter 5.6 internet date/time format in RFC 3339. This is handled automatically by mongoose with timestamps flag.
   */
  @Expose()
  @TransformFromDeepMapping(jobV3toV4FieldMap)
  creationTime: Date;

  /**
   * Time when job should be executed. If not specified then the Job will be executed asap. Format according to chapter 5.6 internet date/time format in RFC 3339.
   */
  @Expose()
  @TransformFromDeepMapping(jobV3toV4FieldMap)
  executionTime?: Date;

  /**
   * Object of key-value pairs defining job input parameters, e.g. 'destinationPath' for retrieve jobs or 'tapeCopies' for archive jobs.
   */
  @Expose()
  @Transform(({ obj }) => {
    const usernameSpec = jobV3toV4FieldMap["jobParams.username"];
    return {
      username: usernameSpec
        ? _.get(obj, usernameSpec.path as string[])
        : undefined,
      ..._.omitBy(obj?.jobParams, (_, key) =>
        Object.values(jobV3toV4FieldMap).some(
          (spec) => spec.path.join(".") === `jobParams.${key}`,
        ),
      ),
    };
  })
  jobParams: Record<string, unknown>;

  /**
   * Defines current status of job lifecycle.
   */
  @Expose()
  @TransformFromDeepMapping(jobV3toV4FieldMap)
  jobStatusMessage?: string;

  /**
   * Array of objects with keys: pid, files. The value for the pid key defines the dataset ID, the value for the files key is an array of file names. This array is either an empty array, implying that all files within the dataset are selected, or an explicit list of dataset-relative file paths, which should be selected.
   */
  @Expose()
  @TransformFromDeepMapping(jobV3toV4FieldMap)
  datasetList: DatasetListDto[];

  /**
   * Detailed return value after job is finished.
   */
  @Expose()
  jobResultObject: Record<string, unknown>;
}
