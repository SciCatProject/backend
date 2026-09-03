import { ApiProperty } from "@nestjs/swagger";
import { Exclude, Expose, Transform } from "class-transformer";
import {
  IsDateString,
  IsNumber,
  IsOptional,
  IsString,
  NotEquals,
} from "class-validator";
import { PublishedDataStatus } from "../interfaces/published-data.interface";
import { BaseOutputDto } from "src/common/dto/base-output.dto";
import { path, PathSpec } from "src/common/utils/deep-mapper.util";
import { TransformFromDeepMapping } from "src/common/decorators/transform-from-deep-mapping.decorator";

export const publishedDataV3toV4FieldMap: Partial<
  Record<keyof PublishedDataObsoleteDto & string, PathSpec>
> = {
  pidArray: path("datasetPids"),
  creator: path("metadata.creators").eachItem("name"),
  authors: path("metadata.contributors").eachItem("name"),
  publisher: path("metadata.publisher.name"),
  relatedPublications: path("metadata.relatedIdentifiers").eachItem(
    "relatedIdentifier",
  ),
  affiliation: path("metadata.affiliation"),
  publicationYear: path("metadata.publicationYear"),
  url: path("metadata.url"),
  dataDescription: path("metadata.dataDescription"),
  resourceType: path("metadata.resourceType"),
  numberOfFiles: path("metadata.numberOfFiles"),
  sizeOfArchive: path("metadata.sizeOfArchive"),
  scicatUser: path("metadata.scicatUser"),
  thumbnail: path("metadata.thumbnail"),
  downloadLink: path("metadata.downloadLink"),
};

export class PublishedDataObsoleteDto extends BaseOutputDto {
  @Exclude()
  declare id: string;

  @ApiProperty({
    type: String,
    description:
      "Digital Object Identifier; e.g.," +
      ' "10.xxx/9b1deb4d-3b7d-4bad-9bdd-2b0d7b3dcb6d".',
  })
  @IsString()
  @Expose()
  doi: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "Creator Affiliation.  This field has the semantics of" +
      " [DataCite Creator/affiliation](https://datacite-metadata-schema.readthedocs.io/en/4.5/properties/creator/#affiliation).",
  })
  @IsString()
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  affiliation?: string;

  @ApiProperty({
    type: [String],
    required: true,
    description:
      "Creator of dataset/dataset collection.  This field has the semantics" +
      " of Dublin Core [dcmi:creator](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/creator/)" +
      " and [DataCite Creator/creatorName](https://datacite-metadata-schema.readthedocs.io/en/4.5/properties/creator/#creatorname).",
  })
  @IsString({ each: true })
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  creator: string[];

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Dataset publisher.  This field has the semantics of Dublin Core" +
      " [dcmi:publisher](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/publisher/)" +
      " and [DataCite publisher](https://datacite-metadata-schema.readthedocs.io/en/4.5/properties/publisher).",
  })
  @IsString()
  @NotEquals(null)
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  publisher: string;

  @ApiProperty({
    type: Number,
    required: true,
    description:
      "Year of publication.  This field has the semantics of Dublin Core" +
      " [dcmi:date](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/date/)" +
      " and [DataCite publicationYear](https://datacite-metadata-schema.readthedocs.io/en/4.5/properties/publicationyear/).",
  })
  @IsNumber()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  publicationYear: number;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "The title of the data.  This field has the semantics of Dublin Core" +
      " [dcmi:title](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/title/)" +
      " and [DataCite title](https://datacite-metadata-schema.readthedocs.io/en/4.5/properties/title/).",
  })
  @IsString()
  @Expose()
  title: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Full URL to the landing page for this DOI",
  })
  @IsString()
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  url?: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Abstract text for published datasets.  This field has the semantics" +
      " of [DataCite description](https://datacite-metadata-schema.readthedocs.io/en/4.5/properties/description/)" +
      " with [Abstract descriptionType](https://datacite-metadata-schema.readthedocs.io/en/4.5/appendices/appendix-1/descriptionType/#abstract).",
  })
  @IsString()
  @Expose()
  abstract: string;

  @ApiProperty({
    type: String,
    required: true,
    description:
      "Link to description of how to re-use data.  This field has the" +
      " semantics of Dublic Core [dcmi:description](https://www.dublincore.org/specifications/dublin-core/dcmi-terms/terms/description/)" +
      " and [DataCite description](https://datacite-metadata-schema.readthedocs.io/en/4.5/properties/description/)" +
      " with [Abstract descriptionType](https://datacite-metadata-schema.readthedocs.io/en/4.5/appendices/appendix-1/descriptionType/#abstract).",
  })
  @IsString()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  dataDescription: string;

  @ApiProperty({
    type: String,
    required: true,
    description: "e.g. raw/ derived",
  })
  @IsString()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  resourceType: string;

  @ApiProperty({
    type: Number,
    required: false,
    description: "Number of files",
  })
  @IsNumber()
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  numberOfFiles?: number;

  @ApiProperty({
    type: Number,
    required: false,
    description: "Size of archive",
  })
  @IsNumber()
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  sizeOfArchive?: number;

  @ApiProperty({
    type: [String],
    required: true,
    description:
      "Array of one or more Dataset persistent identifier (pid) values that" +
      " make up the published data.",
  })
  @IsString({ each: true })
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  pidArray: string[];

  @ApiProperty({
    type: [String],
    required: false,
    description: "List of Names of authors of the to be published data",
  })
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  authors?: string[];

  @ApiProperty({
    type: Date,
    description: "Time when doi is successfully registered",
  })
  @IsDateString()
  @Expose()
  registeredTime: Date;

  @ApiProperty({
    type: String,
    description:
      "Indication of position in publication workflow e.g. doiRegistered",
  })
  @IsString()
  @Expose()
  @Transform(
    ({ obj }) =>
      [PublishedDataStatus.REGISTERED, PublishedDataStatus.AMENDED].includes(
        obj.status,
      )
        ? "registered"
        : "pending_registration",
    { toClassOnly: true },
  )
  status: string;

  @ApiProperty({
    type: String,
    required: false,
    description:
      "The username of the user that clicks the publish button in the client",
  })
  @IsString()
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  scicatUser?: string;

  @ApiProperty({
    type: String,
    required: false,
    description: "Small, less than 16 MB base 64 image preview of dataset",
  })
  @IsString()
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  thumbnail?: string;

  @ApiProperty({
    type: [String],
    required: false,
    description:
      "List of URLs pointing to related publications like DOI URLS of journal articles",
  })
  @IsString({ each: true })
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  relatedPublications?: string[];

  @ApiProperty({
    type: String,
    required: false,
    description: "URL pointing to page from which data can be downloaded",
  })
  @IsString()
  @IsOptional()
  @Expose()
  @TransformFromDeepMapping(publishedDataV3toV4FieldMap)
  downloadLink?: string;
}
