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

  [key: string]: unknown;
}
