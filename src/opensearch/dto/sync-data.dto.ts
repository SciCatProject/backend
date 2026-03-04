import { ApiProperty } from "@nestjs/swagger";
import { IsString } from "class-validator";

export class SyncDatabaseDto {
  @ApiProperty({
    type: String,
    required: true,
    default: "dataset",
    description: "Sync datasets into elastic search with this index",
  })
  @IsString()
  readonly index: string;
}
