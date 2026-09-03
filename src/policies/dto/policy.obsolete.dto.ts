import { ApiProperty } from "@nestjs/swagger";
import { Expose } from "class-transformer";
import { BaseOutputDto } from "src/common/dto/base-output.dto";
import { path, PathSpec } from "src/common/utils/deep-mapper.util";
import { TransformFromDeepMapping } from "src/common/decorators/transform-from-deep-mapping.decorator";

export const policyV3toV4FieldMap: Partial<
  Record<keyof PolicyObsoleteDto & string, PathSpec>
> = {
  archiveEmailNotification: path("jobPolicies.archive.emailNotification"),
  archiveEmailsToBeNotified: path("jobPolicies.archive.emailTo"),
  tapeRedundancy: path("jobPolicies.archive.tapeRedundancy"),
  autoArchive: path("jobPolicies.archive.autoArchive"),
  autoArchiveDelay: path("jobPolicies.archive.autoArchiveDelay"),
  embargoPeriod: path("jobPolicies.archive.embargoPeriod"),
  retrieveEmailNotification: path("jobPolicies.retrieve.emailNotification"),
  retrieveEmailsToBeNotified: path("jobPolicies.retrieve.emailTo"),
};

export class PolicyObsoleteDto extends BaseOutputDto {
  @ApiProperty({
    description:
      "Defines the emails of users that can modify the policy parameters",
  })
  @Expose()
  manager: string[];

  @ApiProperty({
    description:
      "Defines the level of redundancy in storage to minimize loss of data. Allowed values are low, medium, high. Low could e.g. mean one tape copy only, medium could mean two tape copies and high two geo-redundant tape copies",
  })
  @Expose()
  @TransformFromDeepMapping(policyV3toV4FieldMap, "low")
  tapeRedundancy: string;

  @ApiProperty({
    description:
      "Flag to indicate that a dataset should be automatically archived after ingest. If false then archive delay is ignored",
  })
  @Expose()
  @TransformFromDeepMapping(policyV3toV4FieldMap, true)
  autoArchive: boolean;

  @ApiProperty({
    description:
      "Number of days after dataset creation that (remaining) datasets are archived automatically",
  })
  @Expose()
  @TransformFromDeepMapping(policyV3toV4FieldMap, 7)
  autoArchiveDelay: number;

  @ApiProperty({
    description:
      "Flag is true when an email notification should be sent to archiveEmailsToBeNotified upon an archive job creation",
  })
  @Expose()
  @TransformFromDeepMapping(policyV3toV4FieldMap, false)
  archiveEmailNotification: boolean;

  @ApiProperty({
    description:
      "Array of additional email addresses that should be notified up an archive job creation",
  })
  @Expose()
  @TransformFromDeepMapping(policyV3toV4FieldMap, [])
  archiveEmailsToBeNotified: string[];

  @ApiProperty({
    description:
      "Flag is true when an email notification should be sent to retrieveEmailsToBeNotified upon a retrieval job creation",
  })
  @Expose()
  @TransformFromDeepMapping(policyV3toV4FieldMap, false)
  retrieveEmailNotification: boolean;

  @ApiProperty({
    description:
      "Array of additional email addresses that should be notified up a retrieval job creation",
  })
  @Expose()
  @TransformFromDeepMapping(policyV3toV4FieldMap, [])
  retrieveEmailsToBeNotified: string[];

  @ApiProperty({
    description:
      "Number of years after dataset creation before the dataset becomes public",
  })
  @Expose()
  @TransformFromDeepMapping(policyV3toV4FieldMap, 3)
  embargoPeriod: number;
}
