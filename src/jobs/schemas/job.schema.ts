import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiHideProperty } from "@nestjs/swagger";
import { Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";
import { OwnableClass } from "src/common/schemas/ownable.schema";

export type JobDocument = JobClass & Document;

@Schema({
  collection: "Job",
  minimize: false,
  timestamps: true,
  toJSON: {
    getters: true,
  },
})
export class JobClass extends OwnableClass {
  @ApiHideProperty()
  @Prop({
    type: String,
  })
  _id: string;

  /**
   * Globally unique identifier of a job.2
   */
  @Prop({
    type: String,
    unique: true,
    required: true,
    default: () => uuidv4(),
  })
  id: string;

  /**
   * Defines the user that owns this job.
   */
  @Prop({
    type: String,
    index: true,
  })
  ownerUser: string;

  /**
   * Type of job as defined in the job configuration, e.g. archive, retrieve, etc.
   */
  @Prop({
    type: String,
    required: true,
  })
  type: string;

  /**
   * Defines the current status code of the job.
   */
  @Prop({
    type: String,
    required: false,
  })
  statusCode?: string;

  /**
   * Stores the latest message received with the last status update for the job.
   */
  @Prop({
    type: String,
    required: false,
  })
  statusMessage?: string;

  /**
   * This is the equivalent object of the jobs parameters provided by the user.
   */
  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  jobParams: Record<string, unknown>;

  /**
   * Email of the person to contact regarding this job. If the job is submitted anonymously, an email has to be provided.
   */
  @Prop({
    type: String,
    required: false,
    default: "",
  })
  contactEmail?: string;

  /**
   * Configuration version that was used to create this job.
   */
  @Prop({
    type: Object,
    required: true,
  })
  configVersion: string;

  /**
   * Contains the dataset archiving results. Initially empty, then provided during update.
   */
  @Prop({
    type: Object,
    required: true,
    default: {},
  })
  jobResultObject: Record<string, unknown>;
}
export const JobSchema = SchemaFactory.createForClass(JobClass);

JobSchema.index({ "$**": "text" });
