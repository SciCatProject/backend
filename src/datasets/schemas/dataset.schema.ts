import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Document } from "mongoose";
import { OwnableClass } from "src/common/schemas/ownable.schema";
import { v4 as uuidv4 } from "uuid";
import { LifecycleClass, LifecycleSchema } from "./lifecycle.schema";
import { RelationshipClass, RelationshipSchema } from "./relationship.schema";
import { TechniqueClass, TechniqueSchema } from "./technique.schema";

export type DatasetDocument = DatasetClass & Document;

@Schema({
  collection: "Dataset",
  minimize: false,
  timestamps: true,
  toJSON: {
    getters: true,
  },
})
export class DatasetClass extends OwnableClass {
  @ApiProperty({
    type: String,
    required: true,
    default: function genUUID(): string {
      return (
        (process.env.PID_PREFIX
          ? process.env.PID_PREFIX.replace(/\/$/, "")
          : "undefined") +
        "/" +
        uuidv4()
      );
    },
    description:
      "Persistent Identifier for datasets derived from UUIDv4 and prepended automatically by site specific PID prefix like 20.500.12345/",
  })
  @Prop({
    type: String,
    unique: true,
    required: true,
    default: function genUUID(): string {
      return (
        (process.env.PID_PREFIX
          ? process.env.PID_PREFIX.replace(/\/$/, "")
          : "undefined") +
        "/" +
        uuidv4()
      );
    },
  })
  pid: string;

  @Prop({
    type: String,
  })
  _id: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Owner or custodian of the dataset, usually first name + last name. The string may contain a list of persons, which should then be separated by semicolons.",
  })
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  owner: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Email of the owner or custodian of the dataset. The string may contain a list of emails, which should then be separated by semicolons.",
  })
  @Prop({
    type: String,
    required: false,
  })
  ownerEmail?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "ORCID of the owner or custodian. The string may contain a list of ORCIDs, which should then be separated by semicolons.",
  })
  @Prop({
    type: String,
    required: false,
  })
  orcidOfOwner?: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Email of the contact person for this dataset. The string may contain a list of emails, which should then be separated by semicolons.",
  })
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  contactEmail: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Absolute file path on file server containing the files of this dataset, e.g. /some/path/to/sourcefolder. In case of a single file dataset, e.g. HDF5 data, it contains the path up to, but excluding the filename. Trailing slashes are removed.",
  })
  @Prop({
    type: String,
    required: true,
    index: true,
    set: function stripSlash(v: string): string {
      if (v === "/") return v;
      return v.replace(/\/$/, "");
    },
  })
  sourceFolder: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "DNS host name of file server hosting sourceFolder, optionally including a protocol e.g. [protocol://]fileserver1.example.com",
  })
  @Prop({
    type: String,
    required: false,
    index: true,
  })
  sourceFolderHost?: string;

  @ApiProperty({
    type: Number,
    default: 0,
    required: true,
    description:
      "Total size of all source files contained in source folder on disk when unpacked.",
  })
  @Prop({
    type: Number,
    required: true,
    index: true,
    default: 0,
  })
  size: number;

  @ApiProperty({
    type: Number,
    default: 0,
    required: false,
    description:
      "Total size of all datablock package files created for this dataset.",
  })
  @Prop({ type: Number, required: false, default: 0 })
  packedSize?: number = 0;

  @ApiProperty({
    type: Number,
    default: 0,
    required: true,
    description:
      "Total number of files in all OrigDatablocks for this dataset.",
  })
  @Prop({ type: Number, required: true, default: 0 })
  numberOfFiles: number;

  @ApiProperty({
    type: Number,
    default: 0,
    required: false,
    description: "Total number of files in all Datablocks for this dataset.",
  })
  @Prop({ type: Number, default: 0, required: false })
  numberOfFilesArchived: number;

  @ApiProperty({
    type: Date,
    required: true,
    description:
      "Time when dataset became fully available on disk, i.e. all containing files have been written,  or the dataset was created in SciCat.<br>It is expected to be in ISO8601 format according to specifications for internet date/time format in RFC 3339, chapter 5.6 (https://www.rfc-editor.org/rfc/rfc3339#section-5).<br>Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server.",
  })
  @Prop({ type: Date, required: true, index: true })
  creationTime: Date;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Characterize type of dataset. Either 'raw' or 'derived' by default, additional custom options are defined in datasetTypes.json.",
  })
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  type: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Defines a level of trust, e.g. a measure of how much data was verified or used by other persons.",
  })
  @Prop({ type: String, required: false })
  validationStatus?: string;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of tags associated with the meaning or contents of this dataset. Values should ideally come from defined vocabularies, taxonomies, ontologies or knowledge graphs.",
  })
  @Prop({ type: [String], required: false })
  keywords: string[];

  @ApiProperty({
    type: String,
    required: false,
    description: "Free text explanation of contents of dataset.",
  })
  @Prop({ type: String, required: false })
  description?: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "A name for the dataset, given by the creator to carry some semantic meaning. Useful for display purposes e.g. instead of displaying the pid.",
  })
  @Prop({
    type: String,
    required: true,
  })
  datasetName: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "ACIA information about AUthenticity,COnfidentiality,INtegrity and AVailability requirements of dataset. E.g. AV(ailabilty)=medium could trigger the creation of a two tape copies. Format 'AV=medium,CO=low'. Please check the following post for more info: https://en.wikipedia.org/wiki/Parkerian_Hexad",
  })
  @Prop({ type: String, required: false })
  classification?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Name of the license under which the data can be used.",
  })
  @Prop({ type: String, required: false })
  license?: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Version of the API used when the dataset was created or last updated. API version is defined in code for each release. Managed by the system.",
  })
  @Prop({ type: String, required: true })
  version: string;

  @ApiProperty({
    type: LifecycleClass,
    required: true,
    default: {},
    description:
      "Describes the current status of the dataset during its lifetime with respect to the storage handling systems.",
  })
  @Prop({ type: LifecycleSchema, default: {}, required: true })
  datasetlifecycle?: LifecycleClass;

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(TechniqueClass) },
    required: false,
    default: [],
    description:
      "Array of techniques information, with technique name and pid.",
  })
  @Prop({ type: [TechniqueSchema], required: false, default: [] })
  techniques?: TechniqueClass[];

  @ApiProperty({
    type: "array",
    items: { $ref: getSchemaPath(RelationshipClass) },
    required: false,
    default: [],
    description:
      "Array of relationships with other datasets. It contains relationship type and destination dataset",
  })
  @Prop({ type: [RelationshipSchema], required: false, default: [] })
  relationships?: RelationshipClass[];

  @ApiProperty({
    type: [String],
    required: false,
    default: [],
    description:
      "List of additional users that the dataset has been shared with.",
  })
  @Prop({
    type: [String],
    required: false,
    default: [],
  })
  sharedWith?: string[];

  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description: "JSON object containing the scientific metadata.",
  })
  @Prop({ type: Object, required: false, default: {} })
  scientificMetadata?: Record<string, unknown>;

  @ApiProperty({
    type: String,
    required: false,
    description: "Link to schema for scientific metadata validation.",
  })
  @Prop({ type: String, required: false })
  readonly scientificMetadataSchema?: string;

  @ApiProperty({
    type: Boolean,
    required: false,
    description:
      "Whether the scientificMetadata complies with the scientificMetadataSchema.",
  })
  @Prop({ type: Boolean, required: false })
  readonly scientificMetadataValid?: boolean;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Short comment provided by the user about a given dataset. This is additional to the description field.",
  })
  @Prop({
    type: String,
    required: false,
  })
  comment?: string;

  @ApiProperty({
    type: Number,
    required: false,
    description: "Data Quality Metrics given by the user to rate the dataset.",
  })
  @Prop({
    type: Number,
    required: false,
  })
  dataQualityMetrics?: number;

  @ApiProperty({
    type: String,
    required: false,
    isArray: true,
    description:
      "First and last name of principal investigator(s). Multiple PIs can be provided as separate strings in the array. This field is required if the dataset is a Raw dataset.",
  })
  @Prop({ type: [String], required: false })
  principalInvestigators?: string[];

  @ApiProperty({
    type: Date,
    required: false,
    description:
      "Start time of data acquisition for the current dataset.<br>It is expected to be in ISO8601 format according to specifications for internet date/time format in RFC 3339, chapter 5.6 (https://www.rfc-editor.org/rfc/rfc3339#section-5).<br>Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server.",
  })
  @Prop({ type: Date, required: false })
  startTime?: Date;

  @ApiProperty({
    type: Date,
    required: false,
    description:
      "End time of data acquisition for the current dataset.<br>It is expected to be in ISO8601 format according to specifications for internet date/time format in RFC 3339, chapter 5.6 (https://www.rfc-editor.org/rfc/rfc3339#section-5).<br>Local times without timezone/offset info are automatically transformed to UTC using the timezone of the API server.",
  })
  @Prop({ type: Date, required: false })
  endTime?: Date;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Unique location identifier where data was acquired. Usually in the form /Site-name/facility-name/instrumentOrBeamline-name.",
  })
  @Prop({ type: String, required: false, index: true })
  creationLocation?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Defines the format of the data files in this dataset, e.g Nexus Version x.y.",
  })
  @Prop({ type: String, required: false })
  dataFormat?: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Run number assigned by the system to the data acquisition for the current dataset.",
  })
  @Prop({ type: String, required: false })
  runNumber?: string;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "The ID of the proposal to which the dataset belongs to and it has been acquired under.",
  })
  @Prop({ type: [String], ref: "Proposal", required: false })
  proposalIds?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Single ID or array of IDS of the samples used when collecting the data.",
  })
  @Prop({ type: [String], ref: "Sample", required: false })
  sampleIds?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Id of the instrument or array of IDS of the instruments where the data contained in this dataset was created/acquired.",
  })
  @Prop({ type: [String], ref: "Instrument", required: false })
  instrumentIds?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of input dataset identifiers used in producing the derived dataset. Ideally these are the global identifier to existing datasets inside this or federated data catalogs.",
  })
  @Prop({ type: [String], required: false })
  inputDatasets?: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "A list of links to software repositories which uniquely identifies the pieces of software, including versions, used for yielding the derived data.",
  })
  @Prop({ type: [String], required: false })
  usedSoftware?: string[];

  @ApiProperty({
    type: Object,
    required: false,
    description:
      "The creation process of the derived data will usually depend on input job parameters. The full structure of these input parameters are stored here.",
  })
  @Prop({ type: Object, required: false })
  jobParameters?: Record<string, unknown>;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "The output job logfile. Keep the size of this log data well below 15 MB.",
  })
  @Prop({ type: String, required: false })
  jobLogData?: string;
}

export const DatasetSchema = SchemaFactory.createForClass(DatasetClass);

DatasetSchema.index({ "$**": "text" });
