import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateRelationshipDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "Persistent identifier of the related dataset.",
  })
  @IsString()
  readonly pid: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "Relationship between this dataset and the related one.",
  })
  @IsString()
  relationship: string;
}
