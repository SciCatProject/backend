import { ApiProperty, ApiTags } from "@nestjs/swagger";
import { IsNotEmpty, IsOptional, IsString } from "class-validator";
import { UpdateInstrumentDto } from "./update-instrument.dto";

@ApiTags("instruments")
export class CreateInstrumentDto extends UpdateInstrumentDto {
  @ApiProperty({
    type: String,
    required: true,
  })
  @IsNotEmpty()
  @IsOptional()
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
