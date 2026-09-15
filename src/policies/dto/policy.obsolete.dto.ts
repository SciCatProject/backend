import { ApiProperty } from "@nestjs/swagger";
import { Expose, Transform } from "class-transformer";
import { OwnableDto } from "src/common/dto/ownable.dto";
import { createDeepMapper } from "src/common/utils/deep-mapper.util";
import { Policy } from "../schemas/policy.schema";

/**
 * v3 hardcodes exactly two job types - archive and retrieve - each mapping
 * onto the flat (ownerGroup, type) Policy document shape directly (no
 * generic "any number of types" indirection, since v3 never had one).
 * See policy-legacy-shape.util.ts for how the two combine into one v3
 * resource.
 */
export const archiveV3FieldMap: Partial<
  Record<keyof PolicyArchiveFragmentDto & string, string>
> = {
  archiveEmailNotification: "emailNotification",
  archiveEmailsToBeNotified: "emailTo",
  tapeRedundancy: "policyParams.tapeRedundancy",
  autoArchive: "policyParams.autoArchive",
  autoArchiveDelay: "policyParams.autoArchiveDelay",
  embargoPeriod: "policyParams.embargoPeriod",
};

export const retrieveV3FieldMap: Partial<
  Record<keyof PolicyRetrieveFragmentDto & string, string>
> = {
  retrieveEmailNotification: "emailNotification",
  retrieveEmailsToBeNotified: "emailTo",
};

export const mapArchiveV3toV4Field = createDeepMapper<
  Policy,
  PolicyArchiveFragmentDto
>(archiveV3FieldMap);

export const mapRetrieveV3toV4Field = createDeepMapper<
  Policy,
  PolicyRetrieveFragmentDto
>(retrieveV3FieldMap);

/** The archive-only slice of the v3 output, read off the archive-type document. */
export class PolicyArchiveFragmentDto {
  @Expose()
  @Transform(({ obj, key }) => mapArchiveV3toV4Field(obj, key) ?? false, {
    toClassOnly: true,
  })
  archiveEmailNotification: boolean;

  @Expose()
  @Transform(({ obj, key }) => mapArchiveV3toV4Field(obj, key) ?? [], {
    toClassOnly: true,
  })
  archiveEmailsToBeNotified: string[];

  @Expose()
  @Transform(({ obj, key }) => mapArchiveV3toV4Field(obj, key) ?? "low", {
    toClassOnly: true,
  })
  tapeRedundancy: string;

  @Expose()
  @Transform(({ obj, key }) => mapArchiveV3toV4Field(obj, key) ?? true, {
    toClassOnly: true,
  })
  autoArchive: boolean;

  @Expose()
  @Transform(({ obj, key }) => mapArchiveV3toV4Field(obj, key) ?? 7, {
    toClassOnly: true,
  })
  autoArchiveDelay: number;

  @Expose()
  @Transform(({ obj, key }) => mapArchiveV3toV4Field(obj, key) ?? 3, {
    toClassOnly: true,
  })
  embargoPeriod: number;
}

/** The retrieve-only slice of the v3 output, read off the retrieve-type document. */
export class PolicyRetrieveFragmentDto {
  @Expose()
  @Transform(({ obj, key }) => mapRetrieveV3toV4Field(obj, key) ?? false, {
    toClassOnly: true,
  })
  retrieveEmailNotification: boolean;

  @Expose()
  @Transform(({ obj, key }) => mapRetrieveV3toV4Field(obj, key) ?? [], {
    toClassOnly: true,
  })
  retrieveEmailsToBeNotified: string[];
}

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
  tapeRedundancy: string;

  @ApiProperty({
    description:
      "Flag to indicate that a dataset should be automatically archived after ingest. If false then archive delay is ignored",
  })
  @Expose()
  autoArchive: boolean;

  @ApiProperty({
    description:
      "Number of days after dataset creation that (remaining) datasets are archived automatically",
  })
  @Expose()
  autoArchiveDelay: number;

  @ApiProperty({
    description:
      "Flag is true when an email notification should be sent to archiveEmailsToBeNotified upon an archive job creation",
  })
  @Expose()
  archiveEmailNotification: boolean;

  @ApiProperty({
    description:
      "Array of additional email addresses that should be notified up an archive job creation",
  })
  @Expose()
  archiveEmailsToBeNotified: string[];

  @ApiProperty({
    description:
      "Flag is true when an email notification should be sent to retrieveEmailsToBeNotified upon a retrieval job creation",
  })
  @Expose()
  retrieveEmailNotification: boolean;

  @ApiProperty({
    description:
      "Array of additional email addresses that should be notified up a retrieval job creation",
  })
  @Expose()
  retrieveEmailsToBeNotified: string[];

  @ApiProperty({
    description:
      "Number of years after dataset creation before the dataset becomes public",
  })
  @Expose()
  embargoPeriod: number;

  @ApiProperty()
  @Expose()
  createdAt: Date;

  @ApiProperty()
  @Expose()
  updatedAt: Date;
}
