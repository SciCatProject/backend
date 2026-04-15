import { ApiProperty } from "@nestjs/swagger";
import type { IndexSettings } from "@opensearch-project/opensearch/api/_types/indices._common";
import { IsObject, IsOptional, IsString } from "class-validator";

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
    example: {
      index: {
        number_of_replicas: 1,
        refresh_interval: "1s",
        max_result_window: 1000000,
      },
    },
  })
  @IsObject()
  @IsOptional()
  settings: IndexSettings;
}
