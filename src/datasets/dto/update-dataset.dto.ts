import {
  ApiProperty,
  ApiTags,
  getSchemaPath,
  PartialType,
} from "@nestjs/swagger";
import { OwnableDto } from "../../common/dto/ownable.dto";
import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEmail,
  IsInt,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  Validate,
  ValidateNested,
} from "class-validator";
import { TechniqueClass } from "../schemas/technique.schema";
import { Transform, Type } from "class-transformer";
import { CreateTechniqueDto } from "./create-technique.dto";
import { RelationshipClass } from "../schemas/relationship.schema";
import { CreateRelationshipDto } from "./create-relationship.dto";
import { LifecycleClass } from "../schemas/lifecycle.schema";
import { HistoryClass } from "../schemas/history.schema";
import { encodeScientificMetadataKeys } from "src/common/utils";
import { CustomEmailList } from "../utils/email-list-validator.util";

@ApiTags("datasets")
export class UpdateDatasetDto extends OwnableDto {
  @ApiProperty({
    type: String,
    required: false,
    description:
      "Owner or custodian of the dataset, usually first name + last name. The string may contain a list of persons, which should then be separated by semicolons.",
  })
  @IsString()
  @IsOptional()
  readonly owner?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Email of the owner or custodian of the dataset. The string may contain a list of emails, which should then be separated by semicolons.",
  })
  @IsOptional()
  @IsEmail()
  readonly ownerEmail?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "ORCID of the owner or custodian. The string may contain a list of ORCIDs, which should then be separated by semicolons.",
  })
  @IsOptional()
  @IsString()
  readonly orcidOfOwner?: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Email of the contact person for this dataset. The string may contain a list of emails, which should then be separated by semicolons.",
  })
  @Validate(CustomEmailList)
  readonly contactEmail: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Absolute file path on file server containing the files of this dataset, e.g. /some/path/to/sourcefolder. In case of a single file dataset, e.g. HDF5 data, it contains the path up to, but excluding the filename. Trailing slashes are removed.",
  })
  @IsString()
  readonly sourceFolder: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "DNS host name of file server hosting sourceFolder, optionally including a protocol e.g. [protocol://]fileserver1.example.com",
  })
  @IsOptional()
  @IsUrl({
    require_valid_protocol: false,
    require_protocol: false,
  })
  readonly sourceFolderHost?: string;

  /*
   * size and number of files fields should be managed by the system
   */
  @ApiProperty({
    type: Number,
    default: 0,
    required: false,
    description:
      "Total size of all source files contained in source folder on disk when unpacked.",
  })
  @IsOptional()
  @IsInt()
  readonly size?: number = 0;

  @ApiProperty({
    type: Number,
    default: 0,
    required: false,
    description:
      "Total size of all datablock package files created for this dataset.",
  })
  @IsOptional()
  @IsInt()
  readonly packedSize?: number = 0;

  @ApiProperty({
    type: Number,
    default: 0,
    required: false,
    description:
      "Total number of files in all OrigDatablocks for this dataset.",
  })
  @IsOptional()
  @IsInt()
  readonly numberOfFiles?: number = 0;

  @ApiProperty({
    type: Number,
    default: 0,
    required: false,
    description: "Total number of files in all Datablocks for this dataset.",
  })
  @IsOptional()
  @IsInt()
  readonly numberOfFilesArchived?: number;

  @ApiProperty({
    type: Date,
    required: true,
    description:
      "Time when dataset became fully available on disk, i.e. all containing files have been written,  or the dataset was created in SciCat.<br>It is expected to be in ISO8601 format according to specifications for internet date/time format in RFC 3339, chapter 5.6 (https://www.rfc-editor.org/rfc/rfc3339#section-5).<br>Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server.",
  })
  @IsDateString()
  readonly creationTime: Date;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Defines a level of trust, e.g. a measure of how much data was verified or used by other persons.",
  })
  @IsOptional()
  @IsString()
  readonly validationStatus?: string;

  @ApiProperty({
    type: String,
    required: false,
    isArray: true,
    description:
      "Array of tags associated with the meaning or contents of this dataset. Values should ideally come from defined vocabularies, taxonomies, ontologies or knowledge graphs.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly keywords?: string[];

  @ApiProperty({
    type: String,
    required: false,
    description: "Free text explanation of contents of dataset.",
  })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "A name for the dataset, given by the creator to carry some semantic meaning. Useful for display purposes e.g. instead of displaying the pid. Will be autofilled if missing using info from sourceFolder.",
  })
  @IsString()
  readonly datasetName: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "ACIA information about AUthenticity,COnfidentiality,INtegrity and AVailability requirements of dataset. E.g. AV(ailabilty)=medium could trigger the creation of a two tape copies. Format 'AV=medium,CO=low'",
  })
  @IsOptional()
  @IsString()
  readonly classification?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Name of the license under which the data can be used.",
  })
  @IsOptional()
  @IsString()
  readonly license?: string;

  // it needs to be discussed if this fields is managed by the user or by the system
  @ApiProperty({
    type: Boolean,
    required: false,
    default: false,
    description: "Flag is true when data are made publicly available.",
  })
  @IsOptional()
  @IsBoolean()
  readonly isPublished?: boolean;

  @ApiProperty({
    type: TechniqueClass,
    required: false,
    isArray: true,
    default: [],
    description: "Stores the metadata information for techniques.",
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTechniqueDto)
  readonly techniques?: TechniqueClass[];

  // it needs to be discussed if this fields is managed by the user or by the system
  @ApiProperty({
    type: String,
    required: false,
    isArray: true,
    default: [],
    description: "List of users that the dataset has been shared with.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly sharedWith?: string[];

  // it needs to be discussed if this fields is managed by the user or by the system
  @ApiProperty({
    type: RelationshipClass,
    required: false,
    isArray: true,
    default: [],
    description: "Stores the relationships with other datasets.",
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => CreateRelationshipDto)
  readonly relationships?: RelationshipClass[];

  @ApiProperty({
    type: LifecycleClass,
    required: false,
    default: {},
    description:
      "Describes the current status of the dataset during its lifetime with respect to the storage handling systems.",
  })
  @IsOptional()
  readonly datasetlifecycle?: LifecycleClass;

  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description: "JSON object containing the scientific metadata.",
  })
  @IsOptional()
  @IsObject()
  @Transform(({ value }) => encodeScientificMetadataKeys(value))
  scientificMetadata?: Record<string, unknown>;

  @ApiProperty({
    type: String,
    required: false,
    description: "Link to schema for scientific metadata validation.",
  })
  @IsOptional()
  @IsString()
  readonly scientificMetadataSchema?: string;

  @ApiProperty({
    type: Boolean,
    required: false,
    description:
      "Whether the scientificMetadata complies with the scientificMetadataSchema.",
  })
  @IsOptional()
  @IsBoolean()
  readonly scientificMetadataValid?: boolean;

  @ApiProperty({
    type: String,
    required: false,
    description: "Comment the user has about a given dataset.",
  })
  @IsOptional()
  @IsString()
  readonly comment?: string;

  @ApiProperty({
    type: Number,
    required: false,
    description:
      "Data Quality Metrics is a number given by the user to rate the dataset.",
  })
  @IsOptional()
  @IsNumber()
  readonly dataQualityMetrics?: number;

  @ApiProperty({
    type: String,
    required: false,
    description: "Array of first and last name of principal investigator(s).",
    isArray: true,
  })
  @IsOptional()
  @IsString({ each: true })
  readonly principalInvestigators?: string[];

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
  @IsOptional()
  @IsString()
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
    isArray: true,
    description:
      "ID of the proposal or proposals which the dataset belongs to.<br>This dataset might have been acquired under the listed proposals or is derived from datasets acquired from datasets belonging to the listed datasets.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly proposalIds?: string[];

  @ApiProperty({
    type: String,
    required: false,
    isArray: true,
    description:
      "ID of the sample or samples used when collecting the data included or used in this dataset.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly sampleIds?: string[];

  @ApiProperty({
    type: String,
    isArray: true,
    required: false,
    description:
      "ID of the instrument or instruments where the data included or used in this datasets was collected on.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly instrumentIds?: string[];

  @ApiProperty({
    type: String,
    isArray: true,
    required: false,
    description:
      "Array of input dataset identifiers used in producing the derived dataset. Ideally these are the global identifier to existing datasets inside this or federated data catalogs.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly inputDatasets?: string[];

  @ApiProperty({
    type: String,
    required: false,
    isArray: true,
    description:
      "A list of links to software repositories which uniquely identifies the pieces of software, including versions, used for yielding the derived data.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
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
    type: String,
    required: false,
    description:
      "Run number assigned by the system to the data acquisition for the current dataset.",
  })
  @IsOptional()
  @IsString()
  readonly runNumber?: string;
}

export class PartialUpdateDatasetDto extends PartialType(UpdateDatasetDto) {}

export class UpdateDatasetWithHistoryDto extends UpdateDatasetDto {
  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(HistoryClass) },
    required: false,
    default: [],
    description: "List of history objects containing old and new values.",
  })
  @IsArray()
  @IsOptional()
  @ValidateNested({ each: true })
  @Type(() => HistoryClass)
  readonly history?: HistoryClass[];
}

export class PartialUpdateDatasetWithHistoryDto extends PartialType(
  UpdateDatasetWithHistoryDto,
) {}

export class UpdateDatasetLifecycleDto {
  @ApiProperty({
    type: Boolean,
    required: false,
    description:
      "Flag indicating if dataset is available to be archived and no archive job for this dataset exists yet.",
  })
  @IsOptional()
  @IsBoolean()
  readonly archivable?: boolean;

  @ApiProperty({
    type: Boolean,
    required: false,
    description:
      "Flag indicating if dataset is stored on archive system and is ready to be retrieved.",
  })
  @IsOptional()
  @IsBoolean()
  readonly retrievable?: boolean;

  @ApiProperty({
    type: Boolean,
    required: false,
    description:
      "Flag indicating if dataset can be published. Usually requires a longterm storage option on tape or similar.",
  })
  @IsOptional()
  @IsBoolean()
  readonly publishable?: boolean;

  @ApiProperty({
    type: Date,
    required: false,
    description:
      "Day when dataset will be removed from disk, assuming that is already stored on tape.",
  })
  @IsOptional()
  @IsDateString()
  readonly dateOfDiskPurging?: Date;

  @ApiProperty({
    type: Date,
    required: false,
    description:
      "Day when the dataset's future fate will be evaluated again, e.g. to decide if the dataset can be deleted from archive.",
  })
  @IsOptional()
  @IsDateString()
  readonly archiveRetentionTime?: Date;

  @ApiProperty({
    type: Date,
    required: false,
    description:
      "Day when dataset is supposed to become public according to data policy.",
  })
  @IsOptional()
  @IsDateString()
  readonly dateOfPublishing?: Date;

  @ApiProperty({
    type: Date,
    required: false,
    description: "Day when dataset was published.",
  })
  @IsOptional()
  @IsDateString()
  readonly publishedOn?: Date;

  @ApiProperty({
    type: Boolean,
    required: false,
    description:
      "Flag indicating if full dataset is available on central fileserver. If false, data needs to be copied from decentral storage places to a cache server before the ingest. This information needs to be transferred to the archive system at archive time.",
  })
  @IsOptional()
  @IsBoolean()
  readonly isOnCentralDisk?: boolean;

  @ApiProperty({
    type: String,
    required: false,
    default: "",
    description:
      "Short string defining the current status of the dataset with respect to storage on disk/tape.",
  })
  @IsOptional()
  @IsString()
  readonly archiveStatusMessage?: string;

  @ApiProperty({
    type: String,
    required: false,
    default: "",
    description:
      "Latest message for this dataset concerning retrieval from archive system.",
  })
  @IsOptional()
  @IsString()
  readonly retrieveStatusMessage?: string;

  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description:
      "Detailed status or error message returned by the archive system when archiving this dataset.",
  })
  @IsOptional()
  readonly archiveReturnMessage?: unknown;

  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description:
      "Detailed status or error message returned by the archive system when retrieving this dataset.",
  })
  @IsOptional()
  readonly retrieveReturnMessage?: unknown;

  @ApiProperty({
    type: String,
    required: false,
    description: "Location of the last export destination.",
  })
  @IsOptional()
  readonly exportedTo?: string;

  @ApiProperty({
    type: Boolean,
    required: false,
    default: false,
    description:
      "Set to true when checksum tests after retrieve of datasets were successful.",
  })
  @IsOptional()
  @IsBoolean()
  readonly retrieveIntegrityCheck?: boolean;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Location of the data on the archive system. Allowed values are facility-specific and may be validated when submitting scicat jobs relating to this dataset. Facilities with a single storage location can leave this field empty.",
  })
  @IsOptional()
  storageLocation?: string;
}

export class PartialUpdateDatasetLifecycleDto extends PartialType(
  UpdateDatasetLifecycleDto,
) {}
