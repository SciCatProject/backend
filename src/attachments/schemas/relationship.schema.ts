import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";
import { AttachmentRelationTargetType } from "../types/relationship-filter.enum";

export type RelationshipDocument = AttachmentRelationshipClass & Document;

@Schema({ _id: false })
export class AttachmentRelationshipClass {
  @ApiProperty({
    type: String,
    description: "Array of entity target IDs.",
    default: "",
  })
  @Prop({ type: String, default: "" })
  targetId: string;

  @ApiProperty({
    enum: AttachmentRelationTargetType,
    description: "Type of entity target.",
  })
  @Prop({
    type: String,
    required: true,
    enum: Object.values(AttachmentRelationTargetType),
  })
  targetType: AttachmentRelationTargetType;

  @ApiProperty({
    type: String,
    description: "Relationship type (defaults to 'is attached to').",
    default: "is attached to",
  })
  @Prop({ type: String, default: "is attached to" })
  relationType?: string;
}

export const AttachmentRelationshipSchema = SchemaFactory.createForClass(
  AttachmentRelationshipClass,
);
