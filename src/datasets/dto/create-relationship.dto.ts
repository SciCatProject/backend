import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, Validate } from "class-validator";
import { RelatedIdentifierMatchesType } from "../utils/related-identifier-validator.util";

export class CreateRelationshipDto {
  @ApiProperty({
    type: String,
    required: true,
    description:
      "Identifier of the related entity (e.g. 'https://example.org/datasets/123', '10.1016/j.epsl.2011.11.037', 'arXiv:0706.0001').",
  })
  @Validate(RelatedIdentifierMatchesType)
  @IsString()
  readonly identifier: string;

  @ApiPropertyOptional({
    type: String,
    description:
      "Type of the related identifier (e.g., 'URL', 'DOI', 'arXiv', 'Other'). We may use 'Local' for SciCat identifiers",
    default: "Other",
  })
  @IsString()
  @IsOptional()
  readonly identifierType?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      "Relationship between this dataset and the related entity (e.g., 'IsReferencedBy', 'IsSupplementTo', 'IsCitedBy').",
    default: "IsReferencedBy",
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
  readonly entityType?: string;

  @ApiPropertyOptional({
    type: String,
    description:
      "Identifier of the related entity in the external system. Not used for SciCat-internal relationships.",
  })
  @IsString()
  @IsOptional()
  readonly externalId?: string;
}
