import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiHideProperty, ApiProperty } from "@nestjs/swagger";
import { Document, Schema as MongooseSchema } from "mongoose";
import { OwnableClass } from "src/common/schemas/ownable.schema";
import { v4 as uuidv4 } from "uuid";

export type PolicyDocument = Policy & Document;

@Schema({
  collection: "Policy",
  toJSON: {
    getters: true,
    // supersededBy is internal bookkeeping (see below) - strip it from
    // every response regardless of which controller/endpoint returns the
    // document, rather than relying on each one to remember to omit it.
    transform: (_doc, ret: Record<string, unknown>) => {
      delete ret.supersededBy;
      return ret;
    },
  },
  timestamps: true,
})
export class Policy extends OwnableClass {
  @ApiProperty()
  @Prop({ type: String, default: () => uuidv4() })
  _id: string;

  @ApiProperty({
    description: 'The job type this policy configures, e.g. "archive".',
  })
  @Prop({ type: String, required: true })
  type: string;

  @ApiProperty({
    description:
      "Defines the emails of users that can modify this job type's policy parameters.",
  })
  @Prop({ type: [String] })
  manager: string[];

  @ApiProperty({
    required: false,
    description: "Email recipients for notifications related to this job type.",
  })
  @Prop({ type: [String], required: false })
  emailTo?: string[];

  @ApiProperty({
    required: false,
    description:
      "Indicates whether email notifications are enabled for this job type.",
  })
  @Prop({ type: Boolean, required: false })
  emailNotification?: boolean;

  @ApiProperty({
    required: false,
    type: Object,
    description:
      "Free-form, job-type-specific settings that don't have a common shape across job types (e.g. tapeRedundancy, autoArchive, embargoPeriod for archive).",
  })
  @Prop({ type: MongooseSchema.Types.Mixed, required: false })
  policyParams?: Record<string, unknown>;

  @ApiProperty({
    required: false,
    type: [String],
    description:
      "User emails authorized to create jobs of this type for datasets owned by this ownerGroup. Only enforced for job types configured with the '#datasetPolicyAllowList' create auth. Not populated automatically - must be set explicitly.",
  })
  @Prop({ type: [String], required: false })
  allowedUsers?: string[];

  @ApiProperty({
    required: false,
    type: [String],
    description:
      "Group names authorized to create jobs of this type for datasets owned by this ownerGroup. Only enforced for job types configured with the '#datasetPolicyAllowList' create auth. Not populated automatically - must be set explicitly.",
  })
  @Prop({ type: [String], required: false })
  allowedGroups?: string[];

  // Internal bookkeeping, not part of the public API: if set, this document
  // has been superseded by the (ownerGroup, type) document with this id and
  // is retained only for historical/audit purposes - it is never returned
  // by normal reads (both PoliciesService and PoliciesV4Service exclude it
  // by default) and never authoritative. Set only by data-repair processes (e.g.
  // reconciling pre-existing duplicate ownerGroups), never by normal
  // application writes. Hidden from Swagger and stripped from every
  // response's JSON (see toJSON.transform above).
  // SupersededBy is populated when there's a more recent policy with
  // the same (ownerGroup, type).
  // This is needed because in the v3 implementation there was no uniqueness
  // constraint on ownerGroup, so multiple policies could exist for
  // the same ownerGroup and since the migration splits the policies
  // into separate documents with one archive and one retrieve job type
  // (dictated by the jobType aware field v3 naming convention), there would
  // be no way to determine which ones to merge on gets requests.
  @ApiHideProperty()
  @Prop({ type: String, required: false })
  supersededBy?: string;
}

export const PolicySchema = SchemaFactory.createForClass(Policy);

// partialFilterExpression only supports a narrow set of operators - $exists
// only in its `true` form ($exists: false is implemented internally via
// $not, which partial filters reject outright). {supersededBy: null} is the
// standard workaround: as a partial-filter equality match it covers both
// "field absent" and "field explicitly null" (this app only ever leaves it
// absent, never sets it to null, so that's a distinction without a
// difference here), which is exactly the "live document" set $exists:false
// was meant to express.
PolicySchema.index(
  { ownerGroup: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { supersededBy: null },
  },
);
PolicySchema.index({ "$**": "text" });
