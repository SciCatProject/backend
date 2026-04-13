import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { FilterQuery } from "mongoose";
import { PublishedDataDocument } from "../schemas/published-data.schema";
import { ILimitsFilter } from "src/common/interfaces/common.interface";

export interface IPublishedDataFilters {
  where?: FilterQuery<PublishedDataDocument>;
  include?: { relation: string }[];
  fields?: {
    status: string;
  };
  limits?: ILimitsFilter;
}

export class ICount {
  @ApiProperty()
  count: number;
}

export class FormPopulateData {
  @ApiPropertyOptional()
  resourceType?: string;

  @ApiPropertyOptional()
  description?: string;

  @ApiPropertyOptional()
  title?: string;

  @ApiPropertyOptional()
  abstract?: string;

  @ApiPropertyOptional()
  thumbnail?: string;
}

export interface IRegister {
  doi: string;
}

export enum PublishedDataStatus {
  PRIVATE = "private",
  PUBLIC = "public",
  REGISTERED = "registered",
  AMENDED = "amended",
}
