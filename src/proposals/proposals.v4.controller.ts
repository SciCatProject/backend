import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpStatus,
  InternalServerErrorException,
  NotFoundException,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ClassSerializerInterceptor,
  SerializeOptions,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { validate } from "class-validator";
import { Request } from "express";
import * as jmp from "json-merge-patch";
import { MongoError } from "mongodb";
import { Action } from "src/casl/action.enum";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { MultiUTCTimeInterceptor } from "src/common/interceptors/multi-utc-time.interceptor";
import { IFacets } from "src/common/interfaces/common.interface";
import { ProposalsService } from "./proposals.service";
import { ProposalClass, ProposalDocument } from "./schemas/proposal.schema";
import { IProposalFiltersV4 } from "./interfaces/proposal-filters.v4.interface";
import { IProposalFieldsV4 } from "./interfaces/proposal-fields.v4.interface";
import { CreateProposalV4Dto } from "./dto/create-proposal.v4.dto";
import {
  OutputProposalV4Dto,
  PartialOutputProposalV4Dto,
} from "./dto/output-proposal.v4.dto";
import {
  PartialUpdateProposalV4Dto,
  UpdateProposalV4Dto,
} from "./dto/update-proposal.v4.dto";
import {
  ProposalLookupKeysEnumV4,
  PROPOSAL_LOOKUP_FIELDS_V4,
  ALLOWED_PROPOSAL_KEYS_V4,
  ALLOWED_PROPOSAL_FILTER_KEYS_V4,
} from "./types/proposal-lookup.v4";
import { IncludeValidationPipe } from "src/common/pipes/include-validation.pipe";
import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import { getSwaggerProposalFilterContent } from "./types/proposal-filter-content.v4";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import {
  CountApiResponse,
  FullFacetFilters,
  FullFacetResponse,
  IsValidResponse,
} from "src/common/types";
import { plainToInstance } from "class-transformer";
import { MeasurementPeriodClass } from "./schemas/measurement-period.schema";
import { parseDate } from "src/common/utils";

@ApiBearerAuth()
@ApiExtraModels(MeasurementPeriodClass)
@ApiTags("proposals v4")
/* NOTE: Generated SDK method names include "V4" twice:
 *  - From the controller class name (ProposalsV4Controller)
 *  - From the route version (`version: '4'`)
 * This is intentional for versioned routing.
 */
@Controller({ path: "proposals", version: "4" })
export class ProposalsV4Controller {
  constructor(
    private proposalsService: ProposalsService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async generateProposalInstanceForPermissions(
    proposal: ProposalClass | CreateProposalV4Dto,
  ): Promise<ProposalClass> {
    const proposalInstance = new ProposalClass();
    proposalInstance._id = "";
    proposalInstance.proposalId = proposal.proposalId || "";
    proposalInstance.accessGroups = proposal.accessGroups || [];
    proposalInstance.ownerGroup = proposal.ownerGroup || "";
    proposalInstance.isPublished = proposal.isPublished || false;
    return proposalInstance;
  }

  async checkPermissionsForProposalExtended(
    request: Request,
    proposalInput: CreateProposalV4Dto | string | null,
    group: Action,
  ) {
    if (!proposalInput) {
      throw new NotFoundException(`proposal: ${proposalInput} not found`);
    }

    let proposal = null;

    if (typeof proposalInput === "string") {
      proposal = await this.proposalsService.findOne({
        proposalId: proposalInput,
      });

      if (!proposal) {
        throw new NotFoundException(`proposal: ${proposalInput} not found`);
      }
    } else {
      proposal = proposalInput;
    }

    const user: JWTUser = request.user as JWTUser;
    const proposalInstance =
      await this.generateProposalInstanceForPermissions(proposal);

    const ability = this.caslAbilityFactory.proposalAccess(user);
    const canDoAction = ability.can(group, proposalInstance);

    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized access");
    }

    return proposal;
  }

  addAccessBasedFilters(
    user: JWTUser,
    filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4>,
  ): IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> {
    const ability = this.caslAbilityFactory.proposalAccess(user);
    const canViewAny = ability.can(Action.AccessAny, ProposalClass);
    const canView = ability.can(Action.ProposalRead, ProposalClass);

    if (!user) {
      // In API v4 unauthorized users must use the public endpoints
      throw new ForbiddenException("Unauthorized access");
    } else if (!canViewAny && canView) {
      filter.where = filter.where ?? {};
      if (filter.where["$and"]) {
        filter.where["$and"].push({
          $or: [
            { ownerGroup: { $in: user.currentGroups } },
            { accessGroups: { $in: user.currentGroups } },
            { sharedWith: { $in: [user.email] } },
            { isPublished: true },
          ],
        });
      } else {
        filter.where["$and"] = [
          {
            $or: [
              { ownerGroup: { $in: user.currentGroups } },
              { accessGroups: { $in: user.currentGroups } },
              { sharedWith: { $in: [user.email] } },
              { isPublished: true },
            ],
          },
        ];
      }
    }

    return filter;
  }

  // POST /proposals
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalCreate, ProposalClass),
  )
  @UseInterceptors(
    new MultiUTCTimeInterceptor<ProposalClass, MeasurementPeriodClass>(
      "MeasurementPeriodList",
      ["start", "end"],
    ),
  )
  @Post()
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    type: OutputProposalV4Dto,
    excludeExtraneousValues: false,
  })
  @ApiOperation({
    summary: "It creates a new proposal.",
    description:
      "It creates a new proposal and returns it completed with systems fields.",
  })
  @ApiBody({
    description: "Input fields for the proposal to be created",
    required: true,
    type: CreateProposalV4Dto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: OutputProposalV4Dto,
    description:
      "Create a new proposal and return its representation in SciCat",
  })
  async create(
    @Req() request: Request,
    @Body() createProposalDto: CreateProposalV4Dto,
  ): Promise<OutputProposalV4Dto> {
    const proposalDto = await this.checkPermissionsForProposalExtended(
      request,
      createProposalDto,
      Action.ProposalCreate,
    );

    try {
      const createdProposal = await this.proposalsService.createV4(proposalDto);
      console.log(createdProposal);
      return createdProposal;
    } catch (error) {
      if ((error as MongoError).code === 11000) {
        throw new ConflictException(
          `A proposal with proposalId ${createProposalDto.proposalId?.trim() ? createProposalDto.proposalId : "unknown"} already exists!`,
        );
      } else {
        throw new InternalServerErrorException(
          "Something went wrong. Please try again later.",
          { cause: error },
        );
      }
    }
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalCreate, ProposalClass),
  )
  @HttpCode(HttpStatus.OK)
  @Post("/isValid")
  @ApiOperation({
    summary: "It validates the proposal provided as input.",
    description:
      "It validates the proposal provided as input, and returns true if the information is a valid proposal",
  })
  @ApiBody({
    description: "Input fields for the proposal that needs to be validated",
    required: true,
    type: CreateProposalV4Dto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IsValidResponse,
    description:
      "Check if the proposal provided pass validation. It return true if the validation is passed",
  })
  async isValid(
    @Req() request: Request,
    @Body() createProposalDto: object,
  ): Promise<IsValidResponse> {
    const createProposalDtoInstance = plainToInstance(
      CreateProposalV4Dto,
      createProposalDto,
    );

    const proposalDto = await this.checkPermissionsForProposalExtended(
      request,
      createProposalDtoInstance,
      Action.ProposalCreate,
    );

    const errors = await validate(proposalDto);
    const valid = errors.length === 0;

    return { valid: valid };
  }

  // GET /proposals
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get()
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    type: PartialOutputProposalV4Dto,
    excludeExtraneousValues: false,
  })
  @ApiOperation({
    summary: "It returns a list of proposals.",
    description:
      "It returns a list of proposals. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving proposals",
    required: false,
    type: String,
    content: getSwaggerProposalFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartialOutputProposalV4Dto,
    isArray: true,
    description: "Return the proposals requested",
  })
  async findAll(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_PROPOSAL_KEYS_V4,
        ALLOWED_PROPOSAL_FILTER_KEYS_V4,
      ),
      new IncludeValidationPipe(PROPOSAL_LOOKUP_FIELDS_V4),
    )
    queryFilter: string,
  ): Promise<PartialOutputProposalV4Dto[]> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    const mergedFilters = this.addAccessBasedFilters(
      request.user as JWTUser,
      parsedFilter,
    );

    const proposals =
      await this.proposalsService.findAllCompleteV4(mergedFilters);
    return proposals;
  }

  // GET /proposals/fullfacet
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
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
    @Req() request: Request,
    @Query() filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    const user: JWTUser = request.user as JWTUser;

    if (!user) {
      throw new ForbiddenException("Unauthorized access");
    }

    const fields: IProposalFieldsV4 = JSON.parse(filters.fields ?? "{}");

    const ability = this.caslAbilityFactory.proposalAccess(user);
    const canViewAny = ability.can(Action.AccessAny, ProposalClass);
    const canView = ability.can(Action.ProposalRead, ProposalClass);

    if (!canViewAny && canView && !fields.isPublished) {
      fields.userGroups = fields.userGroups ?? [];
      fields.userGroups.push(...user.currentGroups);
    }

    const parsedFilters: IFacets<IProposalFieldsV4> = {
      fields: fields,
      facets: JSON.parse(filters.facets ?? "[]"),
    };

    return this.proposalsService.fullfacetV4(parsedFilters);
  }

  // GET /proposals/findOne
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get("/findOne")
  @ApiOperation({
    summary: "It returns the first proposal found.",
    description:
      "It returns the first proposal of the ones that matches the filter provided.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving proposal",
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
  async findOne(
    @Req() request: Request,
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

    const mergedFilters = this.addAccessBasedFilters(
      request.user as JWTUser,
      parsedFilter,
    );

    return this.proposalsService.findOneCompleteV4(mergedFilters);
  }

  // GET /proposals/count
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get("/count")
  @ApiOperation({
    summary: "It returns the number of proposals.",
    description:
      "It returns a number of proposals matching the where filter if provided.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving count for proposals",
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
      "Return the number of proposals in the following format: { count: integer }",
  })
  async count(
    @Req() request: Request,
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

    const finalFilters = this.addAccessBasedFilters(
      request.user as JWTUser,
      parsedFilter,
    );

    return this.proposalsService.countV4(finalFilters);
  }

  // GET /proposals/:proposalId
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get("/:proposalId")
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    type: OutputProposalV4Dto,
    excludeExtraneousValues: false,
  })
  @ApiParam({
    name: "proposalId",
    description: "Id of the proposal to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputProposalV4Dto,
    isArray: false,
    description: "Return proposal with proposalId specified",
  })
  @ApiQuery({
    name: "include",
    enum: ProposalLookupKeysEnumV4,
    type: String,
    required: false,
    isArray: true,
  })
  async findById(
    @Req() request: Request,
    @Param("proposalId") proposalId: string,
    @Query("include", new IncludeValidationPipe(PROPOSAL_LOOKUP_FIELDS_V4))
    include: ProposalLookupKeysEnumV4[] | ProposalLookupKeysEnumV4,
  ) {
    const includeArray = Array.isArray(include)
      ? include
      : include && Array(include);

    const proposal = await this.proposalsService.findOneCompleteV4({
      where: { proposalId },
      include: includeArray,
    });

    await this.checkPermissionsForProposalExtended(
      request,
      proposal,
      Action.ProposalRead,
    );

    return proposal;
  }

  // PATCH /proposals/:proposalId
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalUpdate, ProposalClass),
  )
  @UseInterceptors(
    new MultiUTCTimeInterceptor<ProposalClass, MeasurementPeriodClass>(
      "MeasurementPeriodList",
      ["start", "end"],
    ),
  )
  @Patch("/:proposalId")
  @UseInterceptors(ClassSerializerInterceptor)
  @SerializeOptions({
    type: PartialOutputProposalV4Dto,
    excludeExtraneousValues: false,
  })
  @ApiOperation({
    summary: "It partially updates the proposal.",
    description: `It updates the proposal through the proposalId specified. It updates only the specified fields.
Set \`content-type\` header to \`application/merge-patch+json\` if you would like to update nested objects.`,
  })
  @ApiParam({
    name: "proposalId",
    description: "Id of the proposal to modify",
    type: String,
  })
  @ApiConsumes("application/json", "application/merge-patch+json")
  @ApiBody({
    description:
      "Fields that needs to be updated in the proposal. Only the fields that needs to be updated have to be passed in.",
    required: true,
    type: PartialUpdateProposalV4Dto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputProposalV4Dto,
    description:
      "Update an existing proposal and return its representation in SciCat",
  })
  async findByIdAndUpdate(
    @Req() request: Request,
    @Param("proposalId") proposalId: string,
    @Body() updateProposalDto: PartialUpdateProposalV4Dto,
  ): Promise<OutputProposalV4Dto | null> {
    const foundProposal = await this.proposalsService.findOne({
      where: { proposalId: proposalId },
    });

    if (!foundProposal) throw new NotFoundException("Proposal not found");

    await this.checkPermissionsForProposalExtended(
      request,
      foundProposal,
      Action.ProposalUpdate,
    );

    const updateProposalDtoForService =
      request.headers["content-type"] === "application/merge-patch+json"
        ? jmp.apply(foundProposal, updateProposalDto)
        : updateProposalDto;

    const unmodifiedSince = parseDate(request.headers["if-unmodified-since"]);
    const updatedProposal = await this.proposalsService.findOneAndUpdateV4(
      { proposalId },
      updateProposalDtoForService,
      unmodifiedSince,
    );

    return updatedProposal;
  }

  // PUT /proposals/:proposalId
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalUpdate, ProposalClass),
  )
  @UseInterceptors(
    new MultiUTCTimeInterceptor<ProposalClass, MeasurementPeriodClass>(
      "MeasurementPeriodList",
      ["start", "end"],
    ),
  )
  @Put("/:proposalId")
  @ApiOperation({
    summary: "It updates the proposal.",
    description: `It updates(replaces) the proposal specified through the proposalId provided. If optional fields are not provided they will be removed.
      The PUT method is responsible for modifying an existing entity. The crucial part about it is that it is supposed to replace an entity.
      Therefore, if we don't send a field of an entity when performing a PUT request, the missing field should be removed from the document.`,
  })
  @ApiParam({
    name: "proposalId",
    description: "Id of the proposal to modify",
    type: String,
  })
  @ApiBody({
    description:
      "Proposal object that needs to be updated. The whole proposal object with updated fields have to be passed in.",
    required: true,
    type: UpdateProposalV4Dto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputProposalV4Dto,
    description:
      "Update an existing proposal and return its representation in SciCat",
  })
  async findByIdAndReplace(
    @Req() request: Request,
    @Param("proposalId") proposalId: string,
    @Body() updateProposalDto: UpdateProposalV4Dto,
  ): Promise<OutputProposalV4Dto | null> {
    const foundProposal = await this.proposalsService.findOne({
      where: { proposalId: proposalId },
    });

    if (!foundProposal) throw new NotFoundException("Proposal not found");

    await this.checkPermissionsForProposalExtended(
      request,
      foundProposal,
      Action.ProposalUpdate,
    );

    const outputProposalDto = await this.proposalsService.findOneAndReplaceV4(
      { proposalId },
      updateProposalDto,
    );

    return outputProposalDto;
  }

  // DELETE /proposals/:proposalId
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalDelete, ProposalClass),
  )
  @Delete("/:proposalId")
  @ApiOperation({
    summary: "It deletes the proposal.",
    description:
      "It delete the proposal specified through the proposalId specified.",
  })
  @ApiParam({
    name: "proposalId",
    description: "Id of the proposal to be deleted",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputProposalV4Dto,
    description: "ProposalClass value is returned that is removed",
  })
  async findByIdAndDelete(
    @Req() request: Request,
    @Param("proposalId") proposalId: string,
  ) {
    const foundProposal = await this.proposalsService.findOne({
      proposalId,
    });

    await this.checkPermissionsForProposalExtended(
      request,
      foundProposal,
      Action.ProposalDelete,
    );

    const removedProposal = await this.proposalsService.remove({
      proposalId,
    });

    return removedProposal;
  }
}
