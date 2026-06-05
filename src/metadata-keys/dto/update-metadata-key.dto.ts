import { ApiProperty, PartialType } from "@nestjs/swagger";
import {
  IsArray,
  IsOptional,
  IsString,
  ArrayNotEmpty,
  IsBoolean,
} from "class-validator";

export class UpdateMetadataKeyDto {
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
  @IsString({ each: true })
  userGroups: string[];

  @ApiProperty({
    type: Boolean,
    required: true,
    default: false,
    description: "Flag is true when data are made publicly available.",
  })
  @IsBoolean()
  isPublished: boolean;
}

export class PartialUpdateMetadataKeyDto extends PartialType(
  UpdateMetadataKeyDto,
) {}
