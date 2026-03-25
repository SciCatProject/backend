import {
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { UpdateDatasetObsoleteDto } from "./update-dataset-obsolete.dto";
import { Transform, Type } from "class-transformer";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetType } from "../types/dataset-type.enum";
import { OutputAttachmentV3Dto } from "src/attachments/dto-obsolete/output-attachment.v3.dto";
import { decodeScientificMetadataKeys } from "src/common/utils";
import { HistoryClass } from "../schemas/history.schema";

export class OutputDatasetObsoleteDto extends UpdateDatasetObsoleteDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "Persistent identifier of the dataset.",
  })
  @IsString()
  readonly pid: string;

  @ApiProperty({
    type: String,
    required: true,
    enum: [DatasetType.Raw, DatasetType.Derived],
    description:
      "Characterize type of dataset, either 'raw' or 'derived'. Autofilled when choosing the proper inherited models.",
  })
  @IsEnum(DatasetType)
  readonly type: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Version of the API used in creation of the dataset.",
  })
  @IsOptional()
  @IsString()
  readonly version?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "First name and last name of principal investigator(s). If multiple PIs are present, use a semicolon separated list. This field is required if the dataset is a Raw dataset.",
  })
  @IsString()
  @IsOptional()
  readonly principalInvestigator?: string;

  @ApiProperty({
    type: Date,
    required: false,
    description:
      "Start time of data acquisition for the current dataset.<br>It is expected to be in ISO8601 format according to specifications for internet date/time format in RFC 3339, chapter 5.6 (https://www.rfc-editor.org/rfc/rfc3339#section-5).<br>Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server.",
  })
  @IsOptional()
  @IsDateString()
  readonly startTime?: Date;

  @ApiProperty({
    type: Date,
    required: false,
    description:
      "End time of data acquisition for the current dataset.<br>It is expected to be in ISO8601 format according to specifications for internet date/time format in RFC 3339, chapter 5.6 (https://www.rfc-editor.org/rfc/rfc3339#section-5).<br>Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server.",
  })
  @IsOptional()
  @IsDateString()
  readonly endTime?: Date;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Unique location identifier where data was taken, usually in the form /Site-name/facility-name/instrumentOrBeamline-name. This field is required if the dataset is a Raw dataset.",
  })
  @IsString()
  @IsOptional()
  readonly creationLocation?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Defines the format of the data files in this dataset, e.g Nexus Version x.y.",
  })
  @IsOptional()
  @IsString()
  readonly dataFormat?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "ID of the sample used when collecting the data.",
  })
  @IsOptional()
  @IsString()
  readonly sampleId?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "ID of the instrument where the data was created.",
  })
  @IsOptional()
  @IsString()
  readonly instrumentId?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "First name and last name of the person or people pursuing the data analysis. The string may contain a list of names, which should then be separated by semicolons.",
  })
  @IsString()
  @IsOptional()
  readonly investigator?: string;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of input dataset identifiers used in producing the derived dataset. Ideally these are the global identifier to existing datasets inside this or federated data catalogs.",
  })
  @IsString({
    each: true,
  })
  @IsOptional()
  readonly inputDatasets?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "A list of links to software repositories which uniquely identifies the pieces of software, including versions, used for yielding the derived data.",
  })
  @IsString({
    each: true,
  })
  @IsOptional()
  readonly usedSoftware?: string[];

  @ApiProperty({
    type: Object,
    required: false,
    description:
      "The creation process of the derived data will usually depend on input job parameters. The full structure of these input parameters are stored here.",
  })
  @IsOptional()
  @IsObject()
  readonly jobParameters?: Record<string, unknown>;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "The output job logfile. Keep the size of this log data well below 15 MB.",
  })
  @IsOptional()
  @IsString()
  readonly jobLogData?: string;

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(OutputAttachmentV3Dto) },
    required: false,
    description:
      "Small, less than 16 MB attachments, envisaged for png/jpeg previews.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => OutputAttachmentV3Dto)
  attachments?: OutputAttachmentV3Dto[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(OrigDatablock) },
    required: false,
    description:
      "Containers that list all files and their attributes which make up a dataset. Usually filled at the time the dataset's metadata is created in the data catalog. Can be used by subsequent archiving processes to create the archived datasets.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => OrigDatablock)
  origdatablocks?: OrigDatablock[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(Datablock) },
    required: false,
    description:
      "When archiving a dataset, all files contained in the dataset are listed here together with their checksum information. Several datablocks can be created if the file listing is too long for a single datablock. This partitioning decision is done by the archiving system to allow for chunks of datablocks with manageable sizes. E.g a datasets consisting of 10 TB of data could be split into 10 datablocks of about 1 TB each. The upper limit set by the data catalog system itself is given by the fact that documents must be smaller than 16 MB, which typically allows for datasets of about 100000 files.",
  })
  @IsOptional()
  @IsArray()
  @Type(() => Datablock)
  datablocks?: Datablock[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(HistoryClass) },
    required: false,
    description:
      "List of changes made to this dataset record. For compatibility with legacy backend",
  })
  @IsOptional()
  @IsArray()
  @Type(() => HistoryClass)
  history?: HistoryClass[];

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
    type: Object,
    required: false,
    default: {},
    description: "JSON object containing the scientific metadata.",
  })
  @Transform(({ value }) => decodeScientificMetadataKeys(value))
  @Transform(
    ({ value, obj }) => {
      if (value.runNumber) return value;
      if (!obj?.runNumber) return value;
      return { ...value, runNumber: obj.runNumber };
    },
    { toClassOnly: true },
  )
  declare scientificMetadata?: Record<string, unknown>;
}
