import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";
import { UpdateInstrumentDto } from "./update-instrument.dto";

@ApiTags("instruments")
export class CreateInstrumentDto extends UpdateInstrumentDto {
  @IsOptional()
  @ApiProperty({
    type: String,
    required: false,
    uniqueItems: true,
  })
  @IsString()
  readonly pid: string;

  @ApiProperty({
    type: String,
    uniqueItems: true,
    required: true,
  })
  @IsString()
  readonly uniqueName: string;
}
