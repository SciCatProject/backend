import { ApiTags, PartialType } from "@nestjs/swagger";
import { Type } from "class-transformer";
import {
  IsArray,
  IsDateString,
  IsEmail,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { OwnableDto } from "../../common/dto/ownable.dto";
import { MeasurementPeriodClass } from "../schemas/measurement-period.schema";

@ApiTags("proposals")
export class UpdateProposalDto extends OwnableDto {
  /**
   * Email of the Principal Investigator of the proposal.
   */
  @IsOptional()
  @IsEmail()
  readonly pi_email?: string;

  /**
   * First name of principal investigator.
   */
  @IsOptional()
  @IsString()
  readonly pi_firstname?: string;

  /**
   * Last name of principal investigator.
   */
  @IsOptional()
  @IsString()
  readonly pi_lastname?: string;

  /**
   * Email of main proposer.
   */
  @IsEmail()
  readonly email: string;

  /**
   * First name of main proposer.
   */
  @IsOptional()
  @IsString()
  readonly firstname?: string;

  /**
   * Last name of main proposer.
   */
  @IsOptional()
  @IsString()
  readonly lastname?: string;

  /**
   * The title of the proposal.
   */
  @IsString()
  readonly title: string;

  /**
   * Abstract of the proposal.
   */
  @IsOptional()
  @IsString()
  readonly abstract?: string;

  /**
   * ISO Timestamp when the proposal is planned to or has actually started.
   */
  @IsOptional()
  @IsDateString()
  readonly startTime?: Date;

  /**
   * ISO Timestamp when the proposal is planned to or has actually ended.
   */
  @IsOptional()
  @IsDateString()
  readonly endTime?: Date;

  /**
   * List of measurement periods/visits scheduled for the proposal.
   */
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => MeasurementPeriodClass)
  readonly measurementPeriodList?: MeasurementPeriodClass[] = [];

  /**
   * JSON object containing the proposal metadata.
   */
  @IsOptional()
  @IsObject()
  readonly metadata?: Record<string, unknown>;

  /**
   * Parent proposal id.
   */
  @IsOptional()
  @IsString()
  readonly parentProposalId?: string;

  /**
   * Characterize type of proposal, use some of the configured values
   */
  @IsOptional()
  @IsString()
  readonly type?: string;

  /**
   * Ids of the instruments that this proposal is associated with or scheduled on.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly instrumentIds?: string[];

  /*
   * Array of metadata entries associated with the proposal. Values should ideally come from defined vocabularies, taxonomies, ontologies or knowledge graphs.
   */
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly keywords?: string[];
}

export class PartialUpdateProposalDto extends PartialType(UpdateProposalDto) {}
