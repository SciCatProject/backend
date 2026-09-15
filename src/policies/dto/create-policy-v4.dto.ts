import { ApiProperty } from "@nestjs/swagger";
import {
  IsArray,
  IsBoolean,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { OwnableDto } from "src/common/dto/ownable.dto";

export class CreatePolicyV4Dto extends OwnableDto {
  @ApiProperty({
    description: 'The job type this policy configures, e.g. "archive".',
  })
  @IsString()
  readonly type: string;

  @ApiProperty({
    required: false,
    description:
      "Defines the emails of users that can modify this job type's policy parameters",
  })
  @IsArray()
  @IsOptional()
  readonly manager?: string[];

  @ApiProperty({
    required: false,
    description: "Email recipients for notifications related to this job type.",
  })
  @IsArray()
  @IsOptional()
  readonly emailTo?: string[];

  @ApiProperty({
    required: false,
    description:
      "Indicates whether email notifications are enabled for this job type.",
  })
  @IsBoolean()
  @IsOptional()
  readonly emailNotification?: boolean;

  @ApiProperty({
    required: false,
    type: Object,
    description:
      "Free-form, job-type-specific settings that don't have a common shape across job types.",
  })
  @IsObject()
  @IsOptional()
  readonly policyParams?: Record<string, unknown>;

  @ApiProperty({
    required: false,
    description:
      "User emails authorized to create jobs of this type for datasets owned by this ownerGroup. Only enforced for job types configured with the '#datasetPolicyAllowList' create auth.",
  })
  @IsArray()
  @IsOptional()
  readonly allowedUsers?: string[];

  @ApiProperty({
    required: false,
    description:
      "Group names authorized to create jobs of this type for datasets owned by this ownerGroup. Only enforced for job types configured with the '#datasetPolicyAllowList' create auth.",
  })
  @IsArray()
  @IsOptional()
  readonly allowedGroups?: string[];
}
