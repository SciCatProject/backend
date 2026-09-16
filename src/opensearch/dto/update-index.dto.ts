import { ApiProperty } from "@nestjs/swagger";
import type { IndexSettings } from "@opensearch-project/opensearch/api/_types/indices._common.js";
import { IsObject, IsOptional, IsString } from "class-validator";
import { opensearchIndexSettingsExample } from "src/common/utils";

export class UpdateIndexDto {
  @ApiProperty({
    type: String,
    required: true,
    default: "dataset",
    description: "Update an index with this name",
  })
  @IsString()
  @IsOptional()
  index: string;

  @ApiProperty({
    description: "Index settings to update",
    type: Object,
    example: opensearchIndexSettingsExample,
  })
  @IsObject()
  @IsOptional()
  settings: IndexSettings;
}
