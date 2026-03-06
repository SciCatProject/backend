import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class CreateIndexDto {
  @ApiProperty({
    type: String,
    required: true,
    default: "dataset",
    description: "Create an index with this name",
  })
  @IsString()
  readonly index: string;
}
