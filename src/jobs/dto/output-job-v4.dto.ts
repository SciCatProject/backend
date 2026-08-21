import { PartialType } from "@nestjs/swagger";
import { CreateJobDto } from "./create-job.dto";
import {
  IsArray,
  IsDateString,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { PartialOutputDatasetDto } from "src/datasets/dto/output-dataset.dto";

export class OutputJobDto extends CreateJobDto {
  /**
   * Globally unique identifier of a job.
   */
  @IsString()
  id: string;

  /**
   * Current status code of the job.
   */
  @IsOptional()
  @IsString()
  statusCode?: string;

  /**
   * Latest status message received for this job.
   */
  @IsOptional()
  @IsString()
  statusMessage?: string;

  /**
   * Configuration version that was used to create this job.
   */
  @IsString()
  configVersion: string;

  /**
   * "Contains the dataset archiving results.
   */
  @IsObject()
  jobResultObject: Record<string, unknown>;

  /**
   * User who created this job. System managed.
   */
  @IsString()
  createdBy: string;

  /**
   * User who last updated this job. System managed.
   */
  @IsString()
  updatedBy: string;

  /**
   * Date/time when the job was created. ISO 8601 format.
   */
  @IsDateString()
  createdAt: Date;

  /**
   * Date/time when the job was last updated. ISO 8601 format.
   */
  @IsDateString()
  updatedAt: Date;
}

export class PartialOutputJobDto extends PartialType(OutputJobDto) {
  /**
   * Populated when the job is joined with datasets. Contains the related datasets.
   */
  @IsOptional()
  @IsArray()
  datasets: PartialOutputDatasetDto[];

  /**
   * Populated when the job is joined with datasets and their related entities
   * (datablocks, origdatablocks, attachments). Contains datasets with nested details.
   */
  @IsOptional()
  @IsArray()
  datasetDetails: PartialOutputDatasetDto[];
}

export class PartialIntermediateOutputJobDto extends PartialOutputJobDto {
  @IsString()
  _id: string;

  @IsString()
  id: string;

  @IsString()
  type: string;

  @IsString()
  ownerUser: string;

  @IsString()
  ownerGroup: string;
}

export class PartialOutputWithJobIdDto extends PartialOutputJobDto {
  @IsString()
  _id: string;
}
