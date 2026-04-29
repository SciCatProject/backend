import { ApiProperty } from "@nestjs/swagger";
import { IsOptional, IsString } from "class-validator";

export class OwnableDto {
  @ApiProperty({
    type: String,
    required: true,
    description: "Name of the group owning this item.",
  })
  @IsString()
  readonly ownerGroup: string;

  @ApiProperty({
    type: String,
    required: false,
    isArray: true,
    description: "List of groups which have access to this item.",
  })
  @IsOptional()
  @IsString({
    each: true,
  })
  readonly accessGroups?: string[];

  @ApiProperty({
    type: String,
    required: false,
    description: "Group of the instrument which this item was acquired on.",
  })
  @IsOptional()
  @IsString()
  readonly instrumentGroup?: string;
}
