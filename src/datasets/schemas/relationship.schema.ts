import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Document } from "mongoose";

export type RelationshipDocument = RelationshipClass & Document;

@Schema()
export class RelationshipClass {
  @ApiProperty({
    type: String,
    required: true,
    description: "Persistent identifier of the related entity.",
  })
  @Prop({ type: String, required: true })
  pid: string;

  @ApiPropertyOptional({
    type: String,
    description: "Relationship between this dataset and the related entity.",
    default: "is related to",
  })
  @Prop({ type: String, default: "is related to" })
  relationship: string;

  @ApiPropertyOptional({
    type: String,
    description:
      "Type of the related entity (e.g., 'Dataset', 'Logbook', 'Other').",
    default: "Other",
  })
  @Prop({ type: String, default: "Other" })
  relatedEntityType: string;

  @ApiPropertyOptional({
    type: String,
    description: "URL to access the related entity, if applicable.",
  })
  @Prop({ type: String, required: false })
  url?: string;
}

export const RelationshipSchema =
  SchemaFactory.createForClass(RelationshipClass);
