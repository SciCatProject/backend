import {
  ApiProperty,
  ApiTags,
  getSchemaPath,
  PartialType,
} from "@nestjs/swagger";
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
import { CreateMeasurementPeriodDto } from "./create-measurement-period.dto";
import { MeasurementPeriodClass } from "../schemas/measurement-period.schema";

@ApiTags("proposals")
export class UpdateProposalDto extends OwnableDto {
  /**
   * Email of principal investigator.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Email of the Principal Investigator of the proposal.",
  })
  @IsOptional()
  @IsEmail()
  readonly pi_email?: string;

  /**
   * First name of principal investigator.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "First name of the Principal Investigator of the proposal.",
  })
  @IsOptional()
  @IsString()
  readonly pi_firstname?: string;

  /**
   * Last name of principal investigator.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Last name of the Principal Investigator of the proposal.",
  })
  @IsOptional()
  @IsString()
  readonly pi_lastname?: string;

  /**
   * Email of main proposer.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Email of the proposer of the proposal.",
  })
  @IsEmail()
  readonly email: string;

  /**
   * First name of main proposer.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "First name of the proposer of the proposal.",
  })
  @IsOptional()
  @IsString()
  readonly firstname?: string;

  /**
   * Last name of main proposer.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Last name of the proposer of the proposal.",
  })
  @IsOptional()
  @IsString()
  readonly lastname?: string;

  /**
   * The title of the proposal.
   */
  @ApiProperty({
    type: String,
    required: true,
    description: "Title of the proposal.",
  })
  @IsString()
  readonly title: string;

  /**
   * The proposal abstract.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Abstract of the proposal.",
  })
  @IsOptional()
  @IsString()
  readonly abstract?: string;

  /**
   * The date when the data collection starts.
   */
  @ApiProperty({
    type: String,
    required: false,
    description:
      "ISO Timestamp when the proposal is planned to or has actually started.",
  })
  @IsOptional()
  @IsDateString()
  readonly startTime?: Date;

  /**
   * The date when data collection finishes.
   */
  @ApiProperty({
    type: String,
    required: false,
    description:
      "ISO Timestamp when the proposal is planned to or has actually ended.",
  })
  @IsOptional()
  @IsDateString()
  readonly endTime?: Date;

  /**
   * Embedded information used inside proposals to define which type of experiment has to be pursued, where (at which instrument) and when.
   */
  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(MeasurementPeriodClass) },
    required: false,
    default: [],
    description:
      "List of measurement periods/visit scheduled for the proposal.",
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateMeasurementPeriodDto)
  readonly MeasurementPeriodList?: CreateMeasurementPeriodDto[];

  /**
   * JSON object containing the proposal metadata.
   */
  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description: "JSON object containing the proposal metadata.",
  })
  @IsOptional()
  @IsObject()
  readonly metadata?: Record<string, unknown>;

  /**
   * Parent proposal id.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Id of the parent proposal.",
  })
  @IsOptional()
  @IsString()
  readonly parentProposalId?: string;

  /**
   * Characterize type of proposal, use some of the configured values
   */
  @ApiProperty({
    type: String,
    required: true,
    description: "Type of the proposal.",
  })
  @IsOptional()
  @IsString()
  readonly type?: string;

  /**
   * List of instrument IDs associated with the proposal.
   */
  @ApiProperty({
    type: [String],
    required: false,
    default: [],
    description:
      "Ids of the instruments that this proposal is associated with or scheduled on.",
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly instrumentIds?: string[];

  @ApiProperty({
    type: String,
    required: false,
    isArray: true,
    description:
      "Array of metadata entries associated with the proposal. Values should ideally come from defined vocabularies, taxonomies, ontologies or knowledge graphs.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly keywords?: string[];
}

export class PartialUpdateProposalDto extends PartialType(UpdateProposalDto) {}
