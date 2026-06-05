import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  ArrayNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsString,
} from "class-validator";
import { QueryableClass } from "src/common/schemas/queryable.schema";

export class OutputMetadataKeyDto extends QueryableClass {
  @ApiProperty({
    type: String,
    required: true,
    description: "Unique identifier of this metadata key.",
  })
  @IsString()
  declare id: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "Metadata key.",
  })
  @IsString()
  key: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Human readable name associated with this metadata key.",
  })
  @IsOptional()
  @IsString()
  humanReadableName?: string;

  @ApiProperty({
    type: [String],
    required: true,
    description: "List of user groups that can access this key.",
  })
  @IsArray()
  @ArrayNotEmpty()
  @IsString({
    each: true,
  })
  userGroups: string[];

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Type of item this key has been extracted from. Allowed values: Datasets, Proposals, Samples, Instruments.",
  })
  @IsString()
  sourceType: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "Unique identifier of the source item this key is linked to.",
  })
  @IsString()
  sourceId: string;

  @ApiProperty({
    type: Boolean,
    required: true,
    default: false,
    description: "Flag is true when data are made publicly available.",
  })
  @IsBoolean()
  isPublished: boolean;
}

export class PartialOutputMetadataKeyDto extends PartialType(
  OutputMetadataKeyDto,
) {}
