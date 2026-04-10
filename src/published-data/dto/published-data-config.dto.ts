import { ApiProperty } from "@nestjs/swagger";
import { IsObject } from "class-validator";

export class PublishedDataConfigDto {
  @IsObject()
  @ApiProperty({
    description:
      "[JSON schema](https://json-schema.org/docs) defining the structure for the metadata property of PublishedData objects.",
    type: Object,
  })
  metadataSchema: object;

  @IsObject()
  @ApiProperty({
    description:
      "[UI schema](https://jsonforms.io/docs/uischema/) to use in the frontend for metadata edition",
    type: Object,
  })
  uiSchema: object;
}
