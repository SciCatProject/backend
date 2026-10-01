import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";
import { UpdateIndexDto } from "./update-index.dto";
import type { TypeMapping } from "@opensearch-project/opensearch/api/_types/_common.mapping.js";
import { opensearchIndexMappingsExample } from "src/common/utils";

export class CreateIndexDto extends UpdateIndexDto {
  @ApiProperty({
    description: "Index mappings",
    type: Object,
    example: opensearchIndexMappingsExample,
  })
  @IsObject()
  @IsOptional()
  mappings: TypeMapping;
}
