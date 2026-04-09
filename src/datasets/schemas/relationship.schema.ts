import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Document } from "mongoose";

export type RelationshipDocument = RelationshipClass & Document;

@Schema()
export class RelationshipClass {
  @ApiProperty({
    type: String,
    required: true,
    description:
      "Identifier of the related entity (e.g. 'https://example.org/datasets/123', '10.1016/j.epsl.2011.11.037', 'arXiv:0706.0001')",
  })
  @Prop({ type: String, required: true })
  identifier: string;

  @ApiProperty({
    type: String,
    description:
      "Type of the related `identifier` (e.g., 'URL', 'DOI', 'arXiv', 'Other'). We may use 'Local' for SciCat identifiers",
    default: "Other",
  })
  @Prop({ type: String, default: "Other" })
  identifierType: string;

  @ApiProperty({
    type: String,
    description:
      "Relationship between this dataset and the related entity (e.g., 'IsReferencedBy', 'IsSupplementTo', 'IsCitedBy').",
    default: "IsReferencedBy",
  })
  @Prop({ type: String, default: "IsReferencedBy" })
  relationship: string;

  @ApiProperty({
    type: String,
    description:
      "Type of the related entity (e.g., 'Dataset', 'Logbook', 'Other').",
    default: "Other",
  })
  @Prop({ type: String, default: "Other" })
  entityType: string;

  @ApiPropertyOptional({
    type: String,
    description:
      "Identifier of the related entity in the external system. Not used for SciCat-internal relationships.",
  })
  @Prop({ type: String, required: false })
  externalId?: string;
}

export const RelationshipSchema =
  SchemaFactory.createForClass(RelationshipClass);
