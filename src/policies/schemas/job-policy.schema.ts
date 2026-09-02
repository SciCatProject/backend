import { ApiProperty } from "@nestjs/swagger";

export class JobPolicy {
  @ApiProperty({
    required: false,
    description: "Email recipients for notifications related to this job type.",
  })
  emailTo?: string[];

  @ApiProperty({
    required: false,
    description:
      "Indicates whether email notifications are enabled for this job type.",
  })
  emailNotification?: boolean;

  @ApiProperty({
    required: false,
    description:
      "Users and groups authorized to create jobs of this type for datasets owned by this ownerGroup. Each entry is either a user email or a group name. Only enforced for job types configured with the '#datasetPolicyList' create auth. Not populated automatically - must be set explicitly.",
  })
  allowedList?: string[];

  [key: string]: unknown;
}
