import {
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { PartialType } from "@nestjs/swagger";
import { PublishedDataStatus } from "../interfaces/published-data.interface";

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

  /**
   * Array of one or more Dataset persistent identifier (pid) values that make up the published data.
   */
  @IsArray()
  @IsString({ each: true })
  readonly datasetPids: string[];

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
