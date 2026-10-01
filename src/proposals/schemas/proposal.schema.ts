import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiHideProperty } from "@nestjs/swagger";
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
  @Prop({
    type: String,
    required: false,
    index: true,
  })
  pi_email?: string;

  /**
   * First name of principal investigator.
   */
  @Prop({
    type: String,
    required: false,
  })
  pi_firstname?: string;

  /**
   * Last name of principal investigator.
   */
  @Prop({
    type: String,
    required: false,
  })
  pi_lastname?: string;

  /**
   * Email of main proposer.
   */
  @Prop({
    type: String,
    required: true,
  })
  email: string;

  /**
   * First name of main proposer.
   */
  @Prop({
    type: String,
    required: false,
  })
  firstname?: string;

  /**
   * Last name of main proposer.
   */
  @Prop({
    type: String,
    required: false,
  })
  lastname?: string;

  /**
   * The title of the proposal.
   */
  @Prop({
    type: String,
    required: true,
  })
  title: string;

  /**
   * The proposal abstract.
   */
  @Prop({
    type: String,
    required: false,
  })
  abstract?: string;

  /**
   * The date when the data collection starts.
   */
  @Prop({
    type: Date,
    required: false,
  })
  startTime?: Date;

  /**
   * ISO Timestamp when the proposal is planned to or has actually ended.
   */
  @Prop({
    type: Date,
    required: false,
  })
  endTime?: Date;

  /**
   * List of measurement periods/visit scheduled for the proposal
   */
  @Prop({
    type: [MeasurementPeriodSchema],
    required: false,
    default: [],
  })
  MeasurementPeriodList?: MeasurementPeriodClass[];

  /**
   * JSON object containing the proposal metadata.
   */
  @Prop({
    type: Object,
    required: false,
    default: {},
  })
  metadata?: Record<string, unknown>;

  /**
   * Parent proposal id
   */
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
  @Prop({
    type: String,
    default: DEFAULT_PROPOSAL_TYPE,
  })
  type: string = DEFAULT_PROPOSAL_TYPE;

  /**
   * List of instrument IDs associated with the proposal.
   */
  @Prop({
    type: [String],
    default: [],
    required: false,
  })
  instrumentIds?: string[];

  /**
   * Number of Datasets associated or acquired under this proposal.
   */
  @Prop({
    type: Number,
    default: 0,
    required: false,
  })
  numberOfDatasets?: number;

  /*
   * Array of tags associated with the meaning or contents of this dataset. Values should ideally come from defined vocabularies, taxonomies, ontologies or knowledge graphs.
   */
  @Prop({
    type: [String],
    required: false,
  })
  keywords: string[];
}

export const ProposalSchema = SchemaFactory.createForClass(ProposalClass);

ProposalSchema.index({ "$**": "text" });
