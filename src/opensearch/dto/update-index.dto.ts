import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class UpdateIndexDto {
  @ApiProperty({
    type: String,
    required: true,
    default: "dataset",
    description: "Update an index with this name",
  })
  @IsString()
  readonly index: string;
}
