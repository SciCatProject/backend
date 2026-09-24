import { ApiProperty, PartialType, getSchemaPath } from "@nestjs/swagger";
import { CreateDatasetDto } from "./create-dataset.dto";
import { IsArray, IsDateString, IsOptional, IsString } from "class-validator";
import {
  decodeScientificMetadataKeys,
  filterNullFromArray,
} from "src/common/utils";
import { Transform, Type } from "class-transformer";
import { OutputOrigDatablockDto } from "src/origdatablocks/dto/output-origdatablock.dto";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { OutputAttachmentV4Dto } from "src/attachments/dto/output-attachment.v4.dto";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { OutputSampleDto } from "src/samples/dto/output-sample.dto";

export class OutputDatasetDto extends CreateDatasetDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "Persistent identifier of the dataset.",
  })
  @IsString()
  declare pid: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Indicate the user who created this record. This property is added and maintained by the system.",
  })
  @IsString()
  createdBy: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Indicate the user who updated this record last. This property is added and maintained by the system.",
  })
  @IsString()
  updatedBy: string;

  @ApiProperty({
    type: Date,
    required: true,
    description:
      "Date and time when this record was created. This field is managed by mongoose with through the timestamp settings. The field should be a string containing a date in ISO 8601 format (2024-02-27T12:26:57.313Z)",
  })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({
    type: Date,
    required: true,
    description:
      "Date and time when this record was updated last. This field is managed by mongoose with through the timestamp settings. The field should be a string containing a date in ISO 8601 format (2024-02-27T12:26:57.313Z)",
  })
  @IsDateString()
  updatedAt: Date;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Version of the API used when the dataset was created or last updated. API version is defined in code for each release. Managed by the system.",
  })
  @IsOptional()
  @IsString()
  version?: string;

  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description: "JSON object containing the scientific metadata.",
  })
  @Transform(({ value }) => decodeScientificMetadataKeys(value))
  declare scientificMetadata?: Record<string, unknown>;

  @Transform(({ value }) => filterNullFromArray<string>(value))
  declare keywords?: string[];

  @Transform(({ value }) => filterNullFromArray<string>(value))
  declare sharedWith?: string[];

  @Transform(({ value }) => filterNullFromArray<string>(value))
  declare proposalIds?: string[];

  @Transform(({ value }) => filterNullFromArray<string>(value))
  declare sampleIds?: string[];

  @Transform(({ value }) => filterNullFromArray<string>(value))
  declare instrumentIds?: string[];

  @Transform(({ value }) => filterNullFromArray<string>(value))
  declare inputDatasets?: string[];

  @Transform(({ value }) => filterNullFromArray<string>(value))
  declare usedSoftware?: string[];

  @Transform(({ value }) => filterNullFromArray<string>(value))
  declare principalInvestigators?: string[];

  // ---------------------------------------------------------------------------
  // Includable relation fields — populated via ?include query parameter
  // ---------------------------------------------------------------------------

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(OutputOrigDatablockDto) },
    required: false,
    description:
      "Containers that list all files and their attributes which make up a dataset. Included when ?include=origdatablocks is used.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => OutputOrigDatablockDto)
  origdatablocks?: OutputOrigDatablockDto[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(Datablock) },
    required: false,
    description:
      "Archived file blocks with checksums. Included when ?include=datablocks is used.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => Datablock)
  datablocks?: Datablock[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(OutputAttachmentV4Dto) },
    required: false,
    description:
      "Small attachments such as preview images. Included when ?include=attachments is used.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => OutputAttachmentV4Dto)
  attachments?: OutputAttachmentV4Dto[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(Instrument) },
    required: false,
    description:
      "Instruments associated with the dataset. Included when ?include=instruments is used.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => Instrument)
  instruments?: Instrument[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(ProposalClass) },
    required: false,
    description:
      "Proposals associated with the dataset. Included when ?include=proposals is used.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => ProposalClass)
  proposals?: ProposalClass[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(OutputSampleDto) },
    required: false,
    description:
      "Samples associated with the dataset. Included when ?include=samples is used.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => OutputSampleDto)
  samples?: OutputSampleDto[];
}

export class PartialOutputDatasetDto extends PartialType(OutputDatasetDto) {}
