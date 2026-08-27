import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";
import { OwnableClass } from "src/common/schemas/ownable.schema";
import { v4 as uuidv4 } from "uuid";

export type PolicyDocument = Policy & Document;

@Schema({
  collection: "Policy",
  toJSON: {
    getters: true,
  },
  timestamps: true,
})
export class Policy extends OwnableClass {
  @ApiProperty()
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @ApiProperty({
    description:
      "Defines the emails of users that can modify the policy parameters",
  })
  @Prop({ type: [String] })
  manager: string[];

  @ApiProperty({
    description:
      "Emails of users authorized to request deletion (e.g. Principal Investigator or Data Steward job actions) of datasets owned by this ownerGroup. Not populated automatically - must be set explicitly.",
  })
  @Prop({ type: [String] })
  dataDeleteEmails: string[];

  @ApiProperty({
    description:
      "Defines the level of redundancy in storage to minimize loss of data. Allowed values are low, medium, high. Low could e.g. mean one tape copy only, medium could mean two tape copies and high two geo-redundant tape copies",
  })
  @Prop({ type: String, default: "low" })
  tapeRedundancy: string;

  @ApiProperty({
    description:
      "Flag to indicate that a dataset should be automatically archived after ingest. If false then archive delay is ignored",
  })
  @Prop({ type: Boolean, default: true })
  autoArchive: boolean;

  @ApiProperty({
    description:
      "Number of days after dataset creation that (remaining) datasets are archived automatically",
  })
  @Prop({ type: Number, default: 7 })
  autoArchiveDelay: number;

  @ApiProperty({
    description:
      "Flag is true when an email notification should be sent to archiveEmailsToBeNotified upon an archive job creation",
  })
  @Prop({ type: Boolean, default: false })
  archiveEmailNotification: boolean;

  @ApiProperty({
    description:
      "Array of additional email addresses that should be notified up an archive job creation",
  })
  @Prop({ type: [String] })
  archiveEmailsToBeNotified: string[];

  @ApiProperty({
    description:
      "Flag is true when an email notification should be sent to retrieveEmailsToBeNotified upon a retrieval job creation",
  })
  @Prop({ type: Boolean, default: false })
  retrieveEmailNotification: boolean;

  @ApiProperty({
    description:
      "Array of additional email addresses that should be notified up a retrieval job creation",
  })
  @Prop({ type: [String] })
  retrieveEmailsToBeNotified: string[];

  @ApiProperty({
    description:
      "Number of years after dataset creation before the dataset becomes public",
  })
  @Prop({ type: Number, default: 3 })
  embargoPeriod: number;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);

PolicySchema.index({ "$**": "text" });
