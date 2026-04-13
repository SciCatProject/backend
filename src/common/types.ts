import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { ValidationError } from "class-validator";
import { IFullFacets } from "src/elastic-search/interfaces/es-common.type";

export class FullFacetFilters {
  @ApiPropertyOptional()
  facets?: string;

  @ApiPropertyOptional()
  fields?: string;
}

export class FullQueryFilters {
  @ApiPropertyOptional()
  limits?: string;

  @ApiPropertyOptional()
  fields?: string;
}

class TotalSets {
  @ApiProperty({ type: Number })
  totalSets: number;
}

export class FullFacetResponse implements IFullFacets {
  @ApiProperty({ type: TotalSets, isArray: true })
  all: [TotalSets];

  [key: string]: object;
}

export class ProposalCountFilters {
  @ApiPropertyOptional()
  fields?: string;

  @ApiPropertyOptional()
  filter?: string;
}

export class CountApiResponse {
  @ApiProperty({ type: Number })
  count: number;
}

export class IsValidResponse {
  @ApiProperty({ type: Boolean })
  valid: boolean;
  @ApiPropertyOptional()
  reason?: ValidationError[];
}

export class passwordUpdateResponse {
  @ApiProperty({ type: String })
  message: string;
}
