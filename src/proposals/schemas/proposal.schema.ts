import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiHideProperty, ApiProperty, getSchemaPath } from "@nestjs/swagger";
import { Document } from "mongoose";

import { OwnableClass } from "src/common/schemas/ownable.schema";
import {
  MeasurementPeriodClass,
  MeasurementPeriodSchema,
} from "./measurement-period.schema";

// NOTE: This is the proposal default type and it will be used if no proposalTypes.json config file is provided
export const DEFAULT_PROPOSAL_TYPE = "Default Proposal";

export type ProposalDocument = ProposalClass & Document;
@Schema({
  collection: "Proposal",
  toJSON: {
    getters: true,
  },
  timestamps: true,
  minimize: false,
})
export class ProposalClass extends OwnableClass {
  /**
   * Globally unique identifier of a proposal, eg. PID-prefix/internal-proposal-number. PID prefix is auto prepended.
   */
  @ApiProperty({
    type: String,
    required: true,
    description:
      "Persistent Identifier for the proposal. It is suggested to use UUID.",
  })
  @Prop({
    type: String,
    unique: true,
    required: true,
  })
  proposalId: string;

  @ApiHideProperty()
  @Prop({
    type: String,
  })
  _id: string;

  /**
   * Email of principal investigator.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Email of the Principal Investigator of the proposal.",
  })
  @Prop({
    type: String,
    required: false,
    index: true,
  })
  pi_email?: string;

  /**
   * First name of principal investigator.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "First name of the Principal Investigator of the proposal.",
  })
  @Prop({
    type: String,
    required: false,
  })
  pi_firstname?: string;

  /**
   * Last name of principal investigator.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Last name of the Principal Investigator of the proposal.",
  })
  @Prop({
    type: String,
    required: false,
  })
  pi_lastname?: string;

  /**
   * Email of main proposer.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Email of the proposer of the proposal.",
  })
  @Prop({
    type: String,
    required: true,
  })
  email: string;

  /**
   * First name of main proposer.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "First name of the proposer of the proposal.",
  })
  @Prop({
    type: String,
    required: false,
  })
  firstname?: string;

  /**
   * Last name of main proposer.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Last name of the proposer of the proposal.",
  })
  @Prop({
    type: String,
    required: false,
  })
  lastname?: string;

  /**
   * The title of the proposal.
   */
  @ApiProperty({
    type: String,
    required: true,
    description: "Title of the proposal.",
  })
  @Prop({
    type: String,
    required: true,
  })
  title: string;

  /**
   * The proposal abstract.
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Abstract of the proposal.",
  })
  @Prop({
    type: String,
    required: false,
  })
  abstract?: string;

  /**
   * The date when the data collection starts.
   */
  @ApiProperty({
    type: String,
    required: false,
    description:
      "ISO Timestamp when the proposal is planned to or has actually started.",
  })
  @Prop({
    type: Date,
    required: false,
  })
  startTime?: Date;

  /**
   * The date when data collection finishes.
   */
  @ApiProperty({
    type: String,
    required: false,
    description:
      "ISO Timestamp when the proposal is planned to or has actually ended.",
  })
  @Prop({
    type: Date,
    required: false,
  })
  endTime?: Date;

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
  @Prop({
    type: [MeasurementPeriodSchema],
    required: false,
    default: [],
  })
  MeasurementPeriodList?: MeasurementPeriodClass[];

  /**
   * JSON object containing the proposal metadata.
   */
  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description: "JSON object containing the proposal metadata.",
  })
  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  metadata?: Record<string, unknown>;

  /**
   * Parent proposal id
   */
  @ApiProperty({
    type: String,
    required: false,
    description: "Id of the parent proposal.",
  })
  @Prop({
    type: String,
    required: false,
    default: null,
    ref: "Proposal",
  })
  parentProposalId: string | null = null;

  /**
   * Characterize type of proposal, use some of the configured values
   */
  @ApiProperty({
    type: String,
    required: true,
    description: "Type of the proposal.",
  })
  @Prop({
    type: String,
    default: DEFAULT_PROPOSAL_TYPE,
  })
  type: string = DEFAULT_PROPOSAL_TYPE;

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
  @Prop({
    type: [String],
    default: [],
    required: false,
  })
  instrumentIds?: string[];

  /**
   * Number of datasets associated with the proposal.
   */
  @ApiProperty({
    type: Number,
    required: false,
    description:
      "Number of Datasets associated or acquired under this proposal.",
  })
  @Prop({
    type: Number,
    default: 0,
    required: false,
  })
  numberOfDatasets?: number;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of tags associated with the meaning or contents of this dataset. Values should ideally come from defined vocabularies, taxonomies, ontologies or knowledge graphs.",
  })
  @Prop({
    type: [String],
    required: false,
  })
  keywords: string[];
}

export const ProposalSchema = SchemaFactory.createForClass(ProposalClass);

ProposalSchema.index({ "$**": "text" });
