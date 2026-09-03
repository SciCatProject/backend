import { ApiProperty } from "@nestjs/swagger";
import { IsArray, IsObject, IsOptional } from "class-validator";
import { OwnableDto } from "src/common/dto/ownable.dto";
import { JobPolicy } from "../schemas/job-policy.schema";

export class CreatePolicyV4Dto extends OwnableDto {
  @ApiProperty({
    required: false,
    description:
      "Defines the emails of users that can modify the policy parameters",
  })
  @IsArray()
  @IsOptional()
  readonly manager?: string[];

  @ApiProperty({
    type: JobPolicy,
    required: false,
    description:
      "Per-job-type policy settings for this ownerGroup, keyed by job type.",
  })
  @IsObject()
  @IsOptional()
  readonly jobPolicies?: Record<string, JobPolicy>;
}
