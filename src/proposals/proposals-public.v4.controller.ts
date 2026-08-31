import { Controller, Get, Param, Query, HttpStatus } from "@nestjs/common";
import {
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ProposalsService } from "./proposals.service";
import { ProposalDocument } from "./schemas/proposal.schema";
import { IProposalFiltersV4 } from "./interfaces/proposal-filters.v4.interface";
import { IProposalFieldsV4 } from "./interfaces/proposal-fields.v4.interface";
import { IFacets } from "src/common/interfaces/common.interface";
import { MeasurementPeriodClass } from "./schemas/measurement-period.schema";
import { OutputProposalV4Dto } from "./dto/output-proposal.v4.dto";
import {
  CountApiResponse,
  FullFacetFilters,
  FullFacetResponse,
} from "src/common/types";
import {
  ProposalLookupKeysEnumV4,
  PROPOSAL_LOOKUP_FIELDS_V4,
  ALLOWED_PROPOSAL_KEYS_V4,
  ALLOWED_PROPOSAL_FILTER_KEYS_V4,
} from "./types/proposal-lookup.v4";
import { IncludeValidationPipe } from "src/common/pipes/include-validation.pipe";
import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import { getSwaggerProposalFilterContent } from "./types/proposal-filter-content.v4";
import { AllowAny } from "src/auth/decorators/allow-any.decorator";
import {
  ClassSerializerInterceptor,
  SerializeOptions,
  UseInterceptors,
} from "@nestjs/common";

@ApiExtraModels(MeasurementPeriodClass)
@ApiTags("proposals public v4")
/* NOTE: Generated SDK method names include "V4" twice:
 *  - From the controller class name (ProposalsPublicV4Controller)
 *  - From the route version (`version: '4'`)
 * This is intentional for versioned routing.
 */
@Controller({ path: "proposals/public", version: "4" })
export class ProposalsPublicV4Controller {
  constructor(private proposalsService: ProposalsService) {}

  addPublicFilter(
    filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4>,
  ) {
    if (!filter.where) {
      filter.where = {};
    }
    filter.where = { ...filter.where, isPublished: true };
  }

  // GET /proposals/public
  @AllowAny()
  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    type: OutputProposalV4Dto,
    excludeExtraneousValues: false,
  })
  @ApiOperation({
    summary: "It returns a list of public proposals.",
    description:
      "It returns a list of public proposals. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving the public proposals",
    required: false,
    type: String,
    content: getSwaggerProposalFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputProposalV4Dto,
    isArray: true,
    description: "Return the proposals requested",
  })
  async findAllPublic(
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_PROPOSAL_KEYS_V4,
        ALLOWED_PROPOSAL_FILTER_KEYS_V4,
      ),
      new IncludeValidationPipe(PROPOSAL_LOOKUP_FIELDS_V4),
    )
    queryFilter: string,
  ) {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    this.addPublicFilter(parsedFilter);
    const proposals =
      await this.proposalsService.findAllCompleteV4(parsedFilter);
    return proposals;
  }

  // GET /proposals/public/fullfacet
  @AllowAny()
  @Get("/fullfacet")
  @ApiQuery({
    name: "filters",
    description:
      "Defines list of field names, for which facet counts should be calculated",
    required: false,
    type: FullFacetFilters,
    example: '{"facets": ["type","ownerGroup","keywords"], fields: {}}',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FullFacetResponse,
    isArray: true,
    description: "Return fullfacet response for proposals requested",
  })
  async fullfacet(
    @Query() filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    const fields: IProposalFieldsV4 = JSON.parse(filters.fields ?? "{}");
    fields.isPublished = true;

    const parsedFilters: IFacets<IProposalFieldsV4> = {
      fields: fields,
      facets: JSON.parse(filters.facets ?? "[]"),
    };

    return this.proposalsService.fullfacetV4(parsedFilters);
  }

  // GET /proposals/public/count
  @AllowAny()
  @Get("/count")
  @ApiOperation({
    summary: "It returns the number of public proposals.",
    description:
      "It returns a number of public proposals matching the where filter if provided.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving count for public proposals",
    required: false,
    type: String,
    content: getSwaggerProposalFilterContent({
      where: true,
      include: false,
      fields: false,
      limits: false,
    }),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description:
      "Return the number of public proposals in the following format: { count: integer }",
  })
  async countPublic(
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_PROPOSAL_KEYS_V4,
        ALLOWED_PROPOSAL_FILTER_KEYS_V4,
        {
          where: true,
          include: false,
          fields: false,
          limits: false,
        },
      ),
    )
    queryFilter?: string,
  ) {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    this.addPublicFilter(parsedFilter);
    return this.proposalsService.countV4(parsedFilter);
  }

  // GET /proposals/public/findOne
  @AllowAny()
  @Get("/findOne")
  @ApiOperation({
    summary: "It returns the first public proposal found.",
    description:
      "It returns the first public proposal of the ones that matches the filter provided.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving public proposal",
    required: true,
    type: String,
    content: getSwaggerProposalFilterContent({
      where: true,
      include: true,
      fields: true,
      limits: true,
    }),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputProposalV4Dto,
    description: "Return the proposal requested",
  })
  async findOnePublic(
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_PROPOSAL_KEYS_V4,
        ALLOWED_PROPOSAL_FILTER_KEYS_V4,
      ),
      new IncludeValidationPipe(PROPOSAL_LOOKUP_FIELDS_V4),
    )
    queryFilter: string,
  ): Promise<OutputProposalV4Dto | null> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    this.addPublicFilter(parsedFilter);
    return this.proposalsService.findOneCompleteV4(parsedFilter);
  }

  // GET /proposals/public/:proposalId
  @AllowAny()
  @Get("/:proposalId")
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    type: OutputProposalV4Dto,
    excludeExtraneousValues: false,
  })
  @ApiParam({
    name: "proposalId",
    description: "Id of the public proposal to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputProposalV4Dto,
    isArray: false,
    description: "Return public proposal with proposalId specified",
  })
  @ApiQuery({
    name: "include",
    enum: ProposalLookupKeysEnumV4,
    type: String,
    required: false,
    isArray: true,
  })
  async findByIdPublic(
    @Param("proposalId") proposalId: string,
    @Query("include", new IncludeValidationPipe(PROPOSAL_LOOKUP_FIELDS_V4))
    include: ProposalLookupKeysEnumV4[] | ProposalLookupKeysEnumV4,
  ) {
    const includeArray = Array.isArray(include)
      ? include
      : include && Array(include);

    const proposal = await this.proposalsService.findOneCompleteV4({
      where: { proposalId, isPublished: true },
      include: includeArray,
    });

    return proposal;
  }
}
