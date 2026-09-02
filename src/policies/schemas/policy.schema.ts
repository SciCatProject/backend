import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document, Schema as MongooseSchema } from "mongoose";
import { OwnableClass } from "src/common/schemas/ownable.schema";
import { v4 as uuidv4 } from "uuid";
import { JobPolicy } from "./job-policy.schema";

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
    type: JobPolicy,
    required: false,
    description:
      "Per-job-type policy settings for this ownerGroup (e.g. notification recipients), keyed by job type.",
  })
  @Prop({
    type: MongooseSchema.Types.Mixed,
    required: false,
  })
  jobPolicies?: Record<string, JobPolicy>;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);

PolicySchema.index({ "$**": "text" });
