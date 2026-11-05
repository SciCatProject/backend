import {
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { PartialType, ApiPropertyOptional } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { PublishedDataStatus } from "../interfaces/published-data.interface";
import { IsNonBlankResourceIdArray } from "../pipes/resource-id.validation";

const normalizeResourceIds = ({ value }: { value: unknown }): unknown =>
  value === null ? [] : value;

export class UpdatePublishedDataV4Dto {
  /**
   * A name or title by which a resource is known. This field has the semantics of Dublin Core
   * [dcmi:title](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/title/)
   * and [DataCite title](https://datacite-metadata-schema.readthedocs.io/en/4.6/properties/title/).
   */
  @IsString()
  readonly title: string;

  /**
   * A brief description of the resource and the context in which the resource was created. This field has the semantics of
   * [DataCite description](https://datacite-metadata-schema.readthedocs.io/en/4.6/properties/description/)
   * with [Abstract](https://datacite-metadata-schema.readthedocs.io/en/4.6/appendices/appendix-1/descriptionType/#abstract).
   */
  @IsString()
  readonly abstract: string;

  // ========== RESOURCE ID ARRAYS (ALL OPTIONAL FOR v4) ==========

  /**
   * Array of Dataset persistent identifier (pid) values that make up the published data.
   */
  @ApiPropertyOptional({
    type: [String],
    description:
      "Array of Dataset persistent identifier (pid) values that make up the published data. Entries must be non-blank; null is normalized to an empty array.",
    example: ["dataset1", "dataset2"],
  })
  @IsOptional()
  @Transform(normalizeResourceIds)
  @IsArray()
  @IsString({ each: true })
  @IsNonBlankResourceIdArray()
  readonly datasetPids?: string[];

  /**
   * Array of Proposal persistent identifier (pid) values associated with the published data.
   */
  @ApiPropertyOptional({
    type: [String],
    description:
      "Array of Proposal persistent identifier (pid) values associated with the published data. Entries must be non-blank; null is normalized to an empty array.",
    example: ["proposal123", "proposal456"],
  })
  @IsOptional()
  @Transform(normalizeResourceIds)
  @IsArray()
  @IsString({ each: true })
  @IsNonBlankResourceIdArray()
  readonly proposalIds?: string[];

  /**
   * Array of Sample persistent identifier (pid) values associated with the published data.
   */
  @ApiPropertyOptional({
    type: [String],
    description:
      "Array of Sample persistent identifier (pid) values associated with the published data. Entries must be non-blank; null is normalized to an empty array.",
    example: ["sample789", "sample012"],
  })
  @IsOptional()
  @Transform(normalizeResourceIds)
  @IsArray()
  @IsString({ each: true })
  @IsNonBlankResourceIdArray()
  readonly sampleIds?: string[];

  /**
   * Array of Instrument persistent identifier (pid) values associated with the published data.
   */
  @ApiPropertyOptional({
    type: [String],
    description:
      "Array of Instrument persistent identifier (pid) values associated with the published data. Entries must be non-blank; null is normalized to an empty array.",
    example: ["instrumentA", "instrumentB"],
  })
  @IsOptional()
  @Transform(normalizeResourceIds)
  @IsArray()
  @IsString({ each: true })
  @IsNonBlankResourceIdArray()
  readonly instrumentIds?: string[];

  /**
   * Time when doi is successfully registered
   */
  @IsDateString()
  @IsOptional()
  readonly registeredTime?: Date;

  /**
   * Indication of position in publication workflow e.g. registred, private, public
   */
  @IsEnum(PublishedDataStatus)
  @IsOptional()
  readonly status?: string;

  /**
   * JSON object containing the metadata. This will cover most optional fields of the DataCite schema, and will require a mapping from metadata subfields to DataCite Schema definitions.
   */
  @IsObject()
  @IsOptional()
  readonly metadata?: Record<string, unknown>;
}

export class PartialUpdatePublishedDataV4Dto extends PartialType(
  UpdatePublishedDataV4Dto,
) {}
