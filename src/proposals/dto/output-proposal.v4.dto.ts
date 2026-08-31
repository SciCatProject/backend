import { ApiProperty, PartialType } from "@nestjs/swagger";
import { CreateProposalV4Dto } from "./create-proposal.v4.dto";
import { IsDateString, IsOptional, IsString } from "class-validator";

export class OutputProposalV4Dto extends CreateProposalV4Dto {
  @ApiProperty({
    type: String,
    required: true,
    description: "Persistent identifier of the proposal.",
  })
  @IsString()
  declare proposalId: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Indicate the user who created this record. This property is added and maintained by the system.",
  })
  @IsString()
  createdBy: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Indicate the user who updated this record last. This property is added and maintained by the system.",
  })
  @IsString()
  updatedBy: string;

  @ApiProperty({
    type: Date,
    required: true,
    description:
      "Date and time when this record was created. This field is managed by mongoose.",
  })
  @IsDateString()
  createdAt: Date;

  @ApiProperty({
    type: Date,
    required: true,
    description:
      "Date and time when this record was updated last. This field is managed by mongoose.",
  })
  @IsDateString()
  updatedAt: Date;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Version of the API used when the proposal was created or last updated.",
  })
  @IsString()
  @IsOptional()
  version?: string;
}

export class PartialOutputProposalV4Dto extends PartialType(
  OutputProposalV4Dto,
) {}
