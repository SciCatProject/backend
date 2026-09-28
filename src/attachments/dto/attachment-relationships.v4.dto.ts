import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { IsString, IsEnum, IsOptional } from "class-validator";
import { AttachmentRelationTargetType } from "../types/relationship-filter.enum";

export class AttachmentRelationshipsV4Dto {
  @IsString()
  @ApiProperty({
    type: String,
    description: "Array of entity target IDs.",
  })
  targetId: string;

  @IsEnum(AttachmentRelationTargetType)
  @ApiProperty({
    enum: Object.values(AttachmentRelationTargetType),
    description:
      "Type of entity target. Can be one of the following: 'dataset','proposal','sample'.",
  })
  targetType: AttachmentRelationTargetType;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    type: String,
    description: "Relationship type (defaults to 'is attached to').",
    default: "is attached to",
  })
  relationType?: string;
}
