import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";
import { QueryableClass } from "src/common/schemas/queryable.schema";
import { v4 as uuidv4 } from "uuid";

export type MetadataKeyDocument = MetadataKeyClass & Document;

@Schema({
  collection: "MetadataKeys",
  minimize: false,
  timestamps: true,
  toJSON: {
    getters: true,
  },
})
export class MetadataKeyClass extends QueryableClass {
  @ApiProperty({ type: String, default: () => uuidv4() })
  @Prop({
    type: String,
    default: () => uuidv4(),
    sparse: true,
  })
  id: string;

  @Prop({
    type: String,
  })
  _id: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "Metadata key.",
  })
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  key: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Human readable name associated with the metadata key.",
  })
  @Prop({
    type: String,
    required: false,
  })
  humanReadableName?: string;

  @ApiProperty({
    type: [String],
    required: true,
    description: "List of user groups that can access this key.",
  })
  @Prop({
    type: [String],
    required: true,
  })
  userGroups: string[];

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Type of item this key has been extracted from. Allowed values: Datasets, Proposals, Samples, Instruments.",
  })
  @Prop({
    type: String,
    required: true,
    index: true,
  })
  sourceType: string;

  @ApiProperty({
    type: Boolean,
    required: true,
    description: "Flag is true when data are made publicly available.",
  })
  @Prop({ type: Boolean, required: true, default: false })
  isPublished: boolean;

  @ApiProperty({
    type: Number,
    description:
      "Tracks how many sources are using this metadata key. Managed internally.",
  })
  @Prop({ type: Number, default: 0 })
  usageCount: number;

  @ApiProperty({
    type: Object,
    description:
      "Tracks how many datasets per user group reference this metadata key. " +
      "Used to safely remove groups from userGroups when the last dataset " +
      "contributing that group is deleted or updated. " +
      "e.g. { 'groupA': 3, 'groupB': 1 } means 3 datasets with groupA and 1 with groupB use this key.",
  })
  @Prop({ type: Map, of: Number, default: {} })
  userGroupCounts: Map<string, number>;
}

export const MetadataKeySchema = SchemaFactory.createForClass(MetadataKeyClass);

MetadataKeySchema.index({ sourceType: 1, isPublished: 1, key: 1 });
MetadataKeySchema.index({
  sourceType: 1,
  isPublished: 1,
  humanReadableName: 1,
});
MetadataKeySchema.index({ sourceType: 1, userGroups: 1, key: 1 });
MetadataKeySchema.index({ sourceType: 1, userGroups: 1, humanReadableName: 1 });
