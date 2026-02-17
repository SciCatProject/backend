import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";
import { UpdateMetadataKeyDto } from "./update-metadata-key.dto";

export class CreateMetadataKeyDto extends UpdateMetadataKeyDto {
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
}
