import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";
import { QueryableClass } from "src/common/schemas/queryable.schema";
import { v4 as uuidv4 } from "uuid";
import { PublishedDataStatus } from "../interfaces/published-data.interface";
import crypto from "crypto";

export type PublishedDataDocument = PublishedData & Document;

@Schema({
  collection: "PublishedData",
  toJSON: {
    getters: true,
  },
  timestamps: true,
})
export class PublishedData extends QueryableClass {
  @Prop({
    type: String,
    unique: true,
  })
  _id: string;

  @Prop({
    type: String,
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

  @ApiProperty({
    type: String,
    description:
      "Digital Object Identifier; e.g.," +
      ' "10.xxx/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d".',
  })
  @Prop({
    type: String,
    unique: true,
    required: true,
    default: function genUUID(): string {
      return (
        (process.env.DOI_PREFIX
          ? process.env.DOI_PREFIX.replace(/\/$/, "")
          : "undefined") +
        "/" +
        (process.env.DOI_SHORT_SUFFIX === "true"
          ? crypto.randomBytes(10).toString("hex").substring(0, 10)
          : uuidv4())
      );
    },
  })
  doi: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "A name or title by which a resource is known. This field has the semantics of Dublin Core" +
      " [dcmi:title](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/title/)" +
      " and [DataCite title](https://datacite-metadata-schema.readthedocs.io/en/4.6/properties/title/).",
  })
  @Prop({ type: String, required: true })
  title: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "A brief description of the resource and the context in which the resource was created. This field has the semantics" +
      " of [DataCite description](https://datacite-metadata-schema.readthedocs.io/en/4.6/properties/description/)" +
      " with [Abstract descriptionType](https://datacite-metadata-schema.readthedocs.io/en/4.6/appendices/appendix-1/descriptionType/#abstract).",
  })
  @Prop({ type: String, required: true })
  abstract: string;

  @ApiProperty({
    type: Number,
    required: false,
    description:
      "Number of files. Managed by the system and calculated from the datasetPids array",
  })
  @Prop({ type: Number, required: false })
  numberOfFiles?: number;

  @ApiProperty({
    type: Number,
    required: false,
    description:
      "Size of archive. Managed by the system and calculated from the datasetPids array",
  })
  @Prop({ type: Number, required: false })
  sizeOfArchive?: number;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of one or more datasets' persistent identifier values that" +
      " are part of the published data record.",
  })
  @Prop({ type: [String], required: false })
  datasetPids: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of one or more proposals identifier values that" +
      " are part of this published data record.",
  })
  @Prop({ type: [String], required: false })
  proposalIds: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of one or more samples identifier values that" +
      " are part of this published data record.",
  })
  @Prop({ type: [String], required: false })
  sampleIds: string[];

  @ApiProperty({
    type: Date,
    required: false,
    description: "Time when doi is successfully registered with registrar",
  })
  @Prop({ type: Date, index: true, required: false })
  registeredTime?: Date;

  @ApiProperty({
    enum: PublishedDataStatus,
    description:
      "Indication of position in publication workflow e.g. registred, private, public",
  })
  @Prop({
    type: String,
    required: false,
    default: PublishedDataStatus.PRIVATE,
    enum: PublishedDataStatus,
  })
  status?: PublishedDataStatus;

  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description:
      "JSON object containing the metadata. This will cover most optional fields of the DataCite schema, and will require a mapping from metadata subfields to DataCite Schema definitions",
  })
  @Prop({ type: Object, required: false, default: {} })
  metadata?: Record<string, unknown>;
}

export const PublishedDataSchema = SchemaFactory.createForClass(PublishedData);

PublishedDataSchema.index({ "$**": "text" });
