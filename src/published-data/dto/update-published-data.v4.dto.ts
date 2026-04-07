import {
  IsArray,
  IsDateString,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from "class-validator";
import { ApiProperty, ApiTags, PartialType } from "@nestjs/swagger";
import { PublishedDataStatus } from "../interfaces/published-data.interface";
import { OwnableDto } from "src/common/dto/ownable.dto";

@ApiTags("publishedData")
export class UpdatePublishedDataV4Dto extends OwnableDto {
  @ApiProperty({
    type: String,
    required: true,
    description:
      "A name or title by which a resource is known. This field has the semantics of Dublin Core" +
      " [dcmi:title](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/title/)" +
      " and [DataCite title](https://datacite-metadata-schema.readthedocs.io/en/4.6/properties/title/).",
  })
  @IsString()
  readonly title: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "A brief description of the resource and the context in which the resource was created. This field has the semantics" +
      " of [DataCite description](https://datacite-metadata-schema.readthedocs.io/en/4.6/properties/description/)" +
      " with [Abstract descriptionType](https://datacite-metadata-schema.readthedocs.io/en/4.6/appendices/appendix-1/descriptionType/#abstract).",
  })
  @IsString()
  readonly abstract: string;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of one or more datasets' persistent identifier values that" +
      " are part of this published data record.",
  })
  @IsArray()
  @IsString({ each: true })
  readonly datasetPids: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of one or more proposals identifier values that" +
      " are part of this published data record.",
  })
  @IsArray()
  @IsString({ each: true })
  readonly proposalIds: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "Array of one or more samples identifier values that" +
      " are part of this published data record.",
  })
  @IsArray()
  @IsString({ each: true })
  readonly sampleIds: string[];

  @ApiProperty({
    type: Date,
    required: false,
    description: "Time when doi is successfully registered with registrar",
  })
  @IsDateString()
  @IsOptional()
  readonly registeredTime?: Date;

  @ApiProperty({
    enum: PublishedDataStatus,
    description:
      "Indication of position in publication workflow e.g. registred, private, public",
  })
  @IsEnum(PublishedDataStatus)
  @IsOptional()
  readonly status?: string;

  @ApiProperty({
    type: Object,
    required: false,
    default: {},
    description:
      "JSON object containing the metadata. This will cover most optional fields of the DataCite schema, and will require a mapping from metadata subfields to DataCite Schema definitions",
  })
  @IsObject()
  @IsOptional()
  readonly metadata?: Record<string, unknown>;
}

export class PartialUpdatePublishedDataV4Dto extends PartialType(
  UpdatePublishedDataV4Dto,
) {}
