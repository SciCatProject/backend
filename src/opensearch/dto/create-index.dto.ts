import { ApiProperty } from "@nestjs/swagger";
import { IsObject, IsOptional } from "class-validator";
import { UpdateIndexDto } from "./update-index.dto";
import { TypeMapping } from "@opensearch-project/opensearch/api/_types/_common.mapping";

export class CreateIndexDto extends UpdateIndexDto {
  @ApiProperty({
    description: "Index mappings",
    type: Object,
    example: {
      properties: {
        datasetName: { type: "text" },
        ownerGroup: { type: "keyword" },
      },
    },
  })
  @IsObject()
  @IsOptional()
  mappings: Partial<TypeMapping>;
}
