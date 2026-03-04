import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class GetIndexDto {
  @ApiProperty({
    type: String,
    required: true,
    default: "dataset",
    description: "Get an index with this name",
  })
  @IsString()
  readonly index: string;
}
