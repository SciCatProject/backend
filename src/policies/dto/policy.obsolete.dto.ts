import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { OwnableDto } from "src/common/dto/ownable.dto";
import { createDeepMapper } from "src/common/utils/deep-mapper.util";
import { Policy } from "../schemas/policy.schema";

export const policyV3toV4FieldMap: Partial<
  Record<keyof PolicyObsoleteDto & string, string>
> = {
  archiveEmailNotification: "jobPolicies.archive.emailNotification",
  archiveEmailsToBeNotified: "jobPolicies.archive.emailTo",
  tapeRedundancy: "jobPolicies.archive.tapeRedundancy",
  autoArchive: "jobPolicies.archive.autoArchive",
  autoArchiveDelay: "jobPolicies.archive.autoArchiveDelay",
  embargoPeriod: "jobPolicies.archive.embargoPeriod",
  retrieveEmailNotification: "jobPolicies.retrieve.emailNotification",
  retrieveEmailsToBeNotified: "jobPolicies.retrieve.emailTo",
};

export const mapPolicyV3toV4Field = createDeepMapper<Policy, PolicyObsoleteDto>(
  policyV3toV4FieldMap,
);

export class PolicyObsoleteDto extends OwnableDto {
  @ApiProperty()
  @Expose()
  declare readonly ownerGroup: string;

  @ApiProperty({ type: [String] })
  @Expose()
  declare readonly accessGroups?: string[];

  @ApiProperty()
  @Expose()
  declare readonly instrumentGroup?: string;

  @ApiProperty()
  @Expose()
  _id: string;

  @ApiProperty()
  @Expose()
  id: string;

  @ApiProperty()
  @Expose()
  createdBy: string;

  @ApiProperty()
  @Expose()
  updatedBy: string;

  @ApiProperty()
  @Expose()
  isPublished: boolean;

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
  @Transform(({ obj, key }) => mapPolicyV3toV4Field(obj, key) ?? "low", {
    toClassOnly: true,
  })
  tapeRedundancy: string;

  @ApiProperty({
    description:
      "Flag to indicate that a dataset should be automatically archived after ingest. If false then archive delay is ignored",
  })
  @Expose()
  @Transform(({ obj, key }) => mapPolicyV3toV4Field(obj, key) ?? true, {
    toClassOnly: true,
  })
  autoArchive: boolean;

  @ApiProperty({
    description:
      "Number of days after dataset creation that (remaining) datasets are archived automatically",
  })
  @Expose()
  @Transform(({ obj, key }) => mapPolicyV3toV4Field(obj, key) ?? 7, {
    toClassOnly: true,
  })
  autoArchiveDelay: number;

  @ApiProperty({
    description:
      "Flag is true when an email notification should be sent to archiveEmailsToBeNotified upon an archive job creation",
  })
  @Expose()
  @Transform(({ obj, key }) => mapPolicyV3toV4Field(obj, key) ?? false, {
    toClassOnly: true,
  })
  archiveEmailNotification: boolean;

  @ApiProperty({
    description:
      "Array of additional email addresses that should be notified up an archive job creation",
  })
  @Expose()
  @Transform(({ obj, key }) => mapPolicyV3toV4Field(obj, key) ?? [], {
    toClassOnly: true,
  })
  archiveEmailsToBeNotified: string[];

  @ApiProperty({
    description:
      "Flag is true when an email notification should be sent to retrieveEmailsToBeNotified upon a retrieval job creation",
  })
  @Expose()
  @Transform(({ obj, key }) => mapPolicyV3toV4Field(obj, key) ?? false, {
    toClassOnly: true,
  })
  retrieveEmailNotification: boolean;

  @ApiProperty({
    description:
      "Array of additional email addresses that should be notified up a retrieval job creation",
  })
  @Expose()
  @Transform(({ obj, key }) => mapPolicyV3toV4Field(obj, key) ?? [], {
    toClassOnly: true,
  })
  retrieveEmailsToBeNotified: string[];

  @ApiProperty({
    description:
      "Number of years after dataset creation before the dataset becomes public",
  })
  @Expose()
  @Transform(({ obj, key }) => mapPolicyV3toV4Field(obj, key) ?? 3, {
    toClassOnly: true,
  })
  embargoPeriod: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
