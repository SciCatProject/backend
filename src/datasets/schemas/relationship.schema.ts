import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty } from "@nestjs/swagger";
import { Document } from "mongoose";

export type RelationshipDocument = RelationshipClass & Document;

@Schema()
export class RelationshipClass {
  @ApiProperty({
    type: String,
    required: true,
    description: "Persistent identifier of the related dataset.",
  })
  @Prop({ type: String, required: true })
  pid: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "Relationship between this dataset and the related one.",
  })
  @Prop({ type: String, required: true })
  relationship: string;
}

export const RelationshipSchema =
  SchemaFactory.createForClass(RelationshipClass);
