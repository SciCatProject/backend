import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUrl } from "class-validator";

export class CreateRelationshipDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "Persistent identifier of the related dataset.",
  })
  @IsString()
  readonly pid: string;

  @ApiPropertyOptional({
    type: String,
    description: "Relationship between this dataset and the related entity.",
    default: "is related to",
  })
  @IsString()
  @IsOptional()
  readonly relationship?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      "Type of the related entity (e.g., 'Dataset', 'Logbook', 'Other').",
    default: "Other",
  })
  @IsString()
  @IsOptional()
  readonly relatedEntityType?: string;

  @ApiPropertyOptional({
    type: String,
    description: "URL to access the related entity, if applicable.",
  })
  @IsString()
  @IsUrl()
  readonly url?: string;
}
