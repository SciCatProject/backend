import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class DeleteIndexDto {
  @ApiProperty({
    type: String,
    required: true,
    default: "dataset",
    description: "Delete an index with this name",
  })
  @IsString()
  readonly index: string;
}
