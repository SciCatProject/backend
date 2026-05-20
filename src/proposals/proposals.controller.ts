import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Req,
  ForbiddenException,
  ConflictException,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  Headers,
} from "@nestjs/common";
import { Request } from "express";
import { ProposalsService } from "./proposals.service";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { PartialUpdateProposalDto } from "./dto/update-proposal.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { ProposalClass, ProposalDocument } from "./schemas/proposal.schema";
import { AttachmentsService } from "src/attachments/attachments.service";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { CreateAttachmentV3Dto } from "src/attachments/dto-obsolete/create-attachment.v3.dto";
import { PartialUpdateAttachmentV3Dto } from "src/attachments/dto-obsolete/update-attachment.v3.dto";
import { DatasetsService } from "src/datasets/datasets.service";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { IProposalFields } from "./interfaces/proposal-filters.interface";
import { MultiUTCTimeInterceptor } from "src/common/interceptors/multi-utc-time.interceptor";
import { MeasurementPeriodClass } from "./schemas/measurement-period.schema";
import {
  IFacets,
  IFilters,
  ILimitsFilter,
} from "src/common/interfaces/common.interface";
import { IncludeValidationPipe } from "src/common/pipes/include-validation.pipe";
import { IProposalFilters } from "./interfaces/proposal-relations.interface";
import { PROPOSAL_LOOKUP_FIELDS } from "./types/proposal-lookup";
import { plainToInstance } from "class-transformer";
import { validate, ValidatorOptions } from "class-validator";
import {
  filterDescription,
  filterExample,
  fullQueryDescriptionLimits,
  fullQueryExampleLimits,
  parseDate,
  proposalFullFacetExampleFields,
  proposalsFullQueryDescriptionFields,
  proposalsFullQueryExampleFields,
} from "src/common/utils";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { IDatasetFields } from "src/datasets/interfaces/dataset-filters.interface";
import { FindByIdAccessResponse } from "src/samples/samples.controller";
import {
  FullFacetResponse,
  CountApiResponse,
  ProposalCountFilters,
} from "src/common/types";
import { OutputAttachmentV3Dto } from "src/attachments/dto-obsolete/output-attachment.v3.dto";

@ApiBearerAuth()
@ApiTags("proposals")
@Controller("proposals")
export class ProposalsController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly datasetsService: DatasetsService,
    private readonly proposalsService: ProposalsService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  private generateProposalInstanceForPermissions(
    proposal: ProposalClass | CreateProposalDto,
  ): ProposalClass {
    const proposalInstance = new ProposalClass();
    proposalInstance.accessGroups = proposal.accessGroups || [];
    proposalInstance.ownerGroup = proposal.ownerGroup || "";
    proposalInstance.proposalId = proposal.proposalId || "";
    proposalInstance.email = proposal.email || "";
    proposalInstance.isPublished =
      "isPublished" in proposal ? proposal.isPublished : false;

    return proposalInstance;
  }

  private permissionChecker(
    group: Action,
    proposal: ProposalClass | CreateProposalDto | null,
    request: Request,
  ) {
    if (!proposal) {
      return false;
    }

    const proposalInstance =
      this.generateProposalInstanceForPermissions(proposal);

    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.proposalAccess(user);

    const canDoAction = ability.can(group, proposalInstance);
    
    return canDoAction;
  }

  private async checkPermissionsForProposal(
    request: Request,
    id: string,
    group: Action,
  ) {
    const proposal = await this.proposalsService.findOne({
      proposalId: id,
    });

    if (!proposal) {
      throw new NotFoundException(`Proposal: ${id} not found`);
    }

    const canDoAction = this.permissionChecker(group, proposal, request);

    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized to this proposal");
    }

    return proposal;
  }

  private checkPermissionsForProposalCreate(
    request: Request,
    proposal: CreateProposalDto,
    group: Action,
  ) {
    const canDoAction = this.permissionChecker(group, proposal, request);

    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized to create this proposal");
    }

    return proposal;
  }

  updateFiltersForList(
    request: Request,
    mergedFilters: IFilters<ProposalDocument, IProposalFields>,
  ): IFilters<ProposalDocument, IProposalFields> {
    const user: JWTUser = request.user as JWTUser;

    const ability = this.caslAbilityFactory.proposalAccess(user);
    const canViewAny = ability.can(Action.AccessAny, ProposalClass);
    const canView = ability.can(Action.ProposalRead, ProposalClass);
    
    if (!canViewAny) {
      mergedFilters.where = mergedFilters.where ?? {};
      if (!user) {
        if (mergedFilters.where["$and"]) {
          mergedFilters.where["$and"].push({
            isPublished: true,
          });
        } else {
          mergedFilters.where["$and"] = [{ isPublished: true }];
        }
      } else if (canView) {
        if (mergedFilters.where["$and"]) {
          mergedFilters.where["$and"].push({
            $or: [
              { ownerGroup: { $in: user.currentGroups } },
              { accessGroups: { $in: user.currentGroups } },
              { isPublished: true },
            ],
          });
        } else {
          mergedFilters.where["$and"] = [
            {
              $or: [
                { ownerGroup: { $in: user.currentGroups } },
                { accessGroups: { $in: user.currentGroups } },
                { isPublished: true },
              ],
            },
          ];
        }
      }
    }

    return mergedFilters;
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
  @ApiOperation({
    summary: "It creates a new proposal.",
    description:
      "It creates a new proposal and returnes it completed with systems fields.",
  })
  @ApiExtraModels(CreateProposalDto)
  @ApiBody({
    type: CreateProposalDto,
  })
  @ApiResponse({
    status: 201,
    type: ProposalClass,
    description:
      "Create a new proposal and return its representation in SciCat",
  })
  async create(
    @Req() request: Request,
    @Body() createProposalDto: CreateProposalDto,
  ): Promise<ProposalClass> {
    const proposalDTO = this.checkPermissionsForProposalCreate(
      request,
      createProposalDto,
      Action.ProposalCreate,
    );
    const existingProposal = await this.proposalsService.findOne({
      proposalId: createProposalDto.proposalId,
    });

    if (existingProposal) {
      throw new ConflictException(
        `Proposal with ${createProposalDto.proposalId} already exists`,
      );
    }

    return this.proposalsService.create(proposalDTO);
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
    type: CreateProposalDto,
  })
  @ApiResponse({
    status: 200,
    type: Boolean,
    description:
      "Check if the proposal provided pass validation. It return true if the validation is passed",
  })
  async isValid(
    @Req() request: Request,
    @Body() createProposal: unknown,
  ): Promise<{ valid: boolean }> {
    const validatorOptions: ValidatorOptions = {
      skipMissingProperties: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    };

    const dtoProposal = plainToInstance(CreateProposalDto, createProposal);
    const errorsProposal = await validate(dtoProposal, validatorOptions);

    const valid = errorsProposal.length == 0;

    return { valid: valid };
  }

  // GET /proposals
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get()
  @ApiOperation({
    summary: "It returns a list of proposals.",
    description:
      "It returns a list of proposals. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filters",
    description:
      "Database filters to apply when retrieving proposals\n" +
      filterDescription,
    required: false,
    type: String,
    example: filterExample,
  })
  @ApiResponse({
    status: 200,
    type: ProposalClass,
    isArray: true,
    description: "Return the proposals requested",
  })
  async findAll(
    @Req() request: Request,
    @Query("filters", new IncludeValidationPipe(PROPOSAL_LOOKUP_FIELDS))
    filters?: string,
  ): Promise<ProposalClass[]> {
    const { include, ...rest } = JSON.parse(filters ?? "{}");
    const baseFilters: IFilters<ProposalDocument, IProposalFields> =
      this.updateFiltersForList(request, rest);

    if (include) {
      const proposalFilters: IProposalFilters<
        ProposalDocument,
        IProposalFields
      > = { ...baseFilters, include };
      return this.proposalsService.findAllComplete(proposalFilters);
    }
    return this.proposalsService.findAll(baseFilters);
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
    name: "filters",
    description:
      "Database filters to apply when retrieving count for proposals",
    required: false,
    type: ProposalCountFilters,
    example: `{ fields: ${proposalsFullQueryExampleFields}, filter: '{"$or": [{"field1": "value" }, {"field2": "value"}]}'}`,
  })
  @ApiResponse({
    status: 200,
    type: CountApiResponse,
    description:
      "Return the number of proposals in the following format: { count: integer }",
  })
  async count(
    @Req() request: Request,
    @Query() filters: { fields?: string; filter?: string },
  ) {
    const user: JWTUser = request.user as JWTUser;
    const fields: IProposalFields = JSON.parse(filters.fields ?? "{}");
    const filter: IProposalFields = JSON.parse(filters.filter ?? "{}");

    const ability = this.caslAbilityFactory.proposalAccess(user);
    const canViewAny = ability.can(Action.AccessAny, ProposalClass);
    const canView = ability.can(Action.ProposalRead, ProposalClass);

    if (!user) {
      fields.isPublished = true;
    }
    if (!canViewAny && canView) {
      fields.userGroups = fields.userGroups ?? [];
      fields.userGroups.push(...user.currentGroups);
    }

    return this.proposalsService.count({ fields, where: filter });
  }

  // GET /proposals/fullquery
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get("/fullquery")
  @ApiOperation({
    summary: "It returns a list of proposals matching the query provided.",
    description:
      "It returns a list of proposals matching the query provided.<br>This endpoint still needs some work on the query specification.",
  })
  @ApiQuery({
    name: "fields",
    description:
      "Full query filters to apply when retrieving proposals\n" +
      proposalsFullQueryDescriptionFields,
    required: false,
    type: String,
    example: proposalsFullQueryExampleFields,
  })
  @ApiQuery({
    name: "limits",
    description:
      "Define further query parameters like skip, limit, order\n" +
      fullQueryDescriptionLimits,
    required: false,
    type: String,
    example: fullQueryExampleLimits,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProposalClass,
    isArray: true,
    description: "Return proposals requested",
  })
  async fullquery(
    @Req() request: Request,
    @Query() filters: { fields?: string; limits?: string },
  ): Promise<ProposalClass[]> {
    const user: JWTUser = request.user as JWTUser;
    const fields: IProposalFields = JSON.parse(filters.fields ?? "{}");
    const limits: ILimitsFilter = JSON.parse(filters.limits ?? "{}");
    
    const ability = this.caslAbilityFactory.proposalAccess(user);
    const canViewAny = ability.can(Action.AccessAny, ProposalClass);
    const canView = ability.can(Action.ProposalRead, ProposalClass);

    if (!user) {
      fields.isPublished = true;
    }
    if (!canViewAny && canView) {
      fields.userGroups = fields.userGroups ?? [];
      fields.userGroups.push(...user.currentGroups);
    }

    const parsedFilters: IFilters<ProposalDocument, IProposalFields> = {
      fields,
      limits,
    };
    return this.proposalsService.fullquery(parsedFilters);
  }

  // GET /proposals/fullfacet
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get("/fullfacet")
  @ApiQuery({
    name: "fields",
    description:
      "Define the filter conditions by specifying the name of values of fields requested. There is also support for a `text` search to look for strings anywhere in the proposals.",
    required: false,
    type: String,
    example: proposalsFullQueryExampleFields,
  })
  @ApiQuery({
    name: "facets",
    description: "Full facet query filters to apply when retrieving proposals",
    required: false,
    type: String,
    example: proposalFullFacetExampleFields,
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
    const fields: IProposalFields = JSON.parse(filters.fields ?? "{}");
    const facets = JSON.parse(filters.facets ?? "[]");

    const ability = this.caslAbilityFactory.proposalAccess(user);
    const canViewAny = ability.can(Action.AccessAny, ProposalClass);
    const canView = ability.can(Action.ProposalRead, ProposalClass);

    if (!user) {
      fields.isPublished = true;
    }
    if (!canViewAny && canView) {
      fields.userGroups = fields.userGroups ?? [];
      fields.userGroups.push(...user.currentGroups);
    }

    const parsedFilters: IFacets<IProposalFields> = {
      fields,
      facets,
    };

    return this.proposalsService.fullfacet(parsedFilters);
  }

  // GET /proposals/:pid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get("/:pid")
  @ApiOperation({
    summary: "It returns the proposal requested.",
    description: "It returns the proposal requested through the pid specified.",
  })
  @ApiParam({
    name: "pid",
    description: "Id of the proposal to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ProposalClass,
    isArray: false,
    description: "Return proposal with pid specified",
  })
  async findById(
    @Req() request: Request,
    @Param("pid") proposalId: string,
  ): Promise<ProposalClass | null> {
    const proposal = await this.checkPermissionsForProposal(
      request,
      proposalId,
      Action.ProposalRead,
    );

    return proposal;
  }

  // GET /proposals/:pid/authorization
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalRead, ProposalClass),
  )
  @Get("/:pid/authorization")
  @ApiOperation({
    summary: "Check user access to a specific proposal.",
    description:
      "Returns a boolean indicating whether the user has access to the proposal with the specified ID.",
  })
  @ApiParam({
    name: "pid",
    description: "ID of the proposal to check access for",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FindByIdAccessResponse,
    description:
      "Returns canAccess property with boolean true if the user has access to the specified sample, otherwise false.",
  })
  async findByIdAccess(
    @Req() request: Request,
    @Param("pid") proposalId: string,
  ): Promise<{ canAccess: boolean }> {
    const proposal = await this.proposalsService.findOne({
      proposalId,
    });

    const canAccess = this.permissionChecker(
      Action.ProposalRead,
      proposal,
      request,
    );
    return { canAccess };
  }

  // PATCH /proposals/:pid
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
  @Patch("/:pid")
  @ApiOperation({
    summary: "It updates the proposal.",
    description:
      "It updates the proposal specified through the pid specified. it updates only the specified fields.",
  })
  @ApiParam({
    name: "pid",
    description: "Id of the proposal to modify",
    type: String,
  })
  @ApiExtraModels(PartialUpdateProposalDto)
  @ApiBody({
    type: PartialUpdateProposalDto,
  })
  @ApiResponse({
    status: 200,
    type: ProposalClass,
    description:
      "Update an existing proposal and return its representation in SciCat",
  })
  async update(
    @Req() request: Request,
    @Param("pid") proposalId: string,
    @Headers() headers: Record<string, string>,
    @Body() updateProposalDto: PartialUpdateProposalDto,
  ): Promise<ProposalClass | null> {
    await this.checkPermissionsForProposal(
      request,
      proposalId,
      Action.ProposalUpdate,
    );

    const unmodifiedSince = parseDate(headers["if-unmodified-since"]);
    return this.proposalsService.findOneAndUpdate(
      { proposalId: proposalId },
      updateProposalDto,
      unmodifiedSince,
    );
  }

  // DELETE /proposals/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalDelete, ProposalClass),
  )
  @Delete("/:pid")
  @ApiOperation({
    summary: "It deletes the proposal.",
    description: "It delete the proposal specified through the pid specified.",
  })
  @ApiParam({
    name: "pid",
    description: "Id of the proposal to delete",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "No value is returned",
  })
  async remove(
    @Req() request: Request,
    @Param("pid") proposalId: string,
  ): Promise<unknown> {
    await this.checkPermissionsForProposal(
      request,
      proposalId,
      Action.ProposalDelete,
    );
    return this.proposalsService.remove({ proposalId: proposalId });
  }

  // POST /proposals/:id/attachments
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalAttachmentCreate, ProposalClass),
  )
  @Post("/:pid/attachments")
  @ApiOperation({
    summary: "It creates a new attachement for the proposal specified.",
    description:
      "It creates a new attachement for the proposal specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Id of the proposal we would like to create a new attachment for",
    type: String,
  })
  @ApiExtraModels(CreateAttachmentV3Dto)
  @ApiBody({
    type: CreateAttachmentV3Dto,
  })
  @ApiResponse({
    status: 201,
    type: Attachment,
    description:
      "Create a new attachment for the proposal identified by the pid specified",
  })
  async createAttachment(
    @Req() request: Request,
    @Param("pid") proposalId: string,
    @Body() createAttachmentDto: CreateAttachmentV3Dto,
  ): Promise<OutputAttachmentV3Dto> {
    await this.checkPermissionsForProposal(
      request,
      proposalId,
      Action.ProposalAttachmentCreate,
    );

    const createAttachment = {
      ...createAttachmentDto,
      proposalId: proposalId,
    };
    return this.attachmentsService.create(createAttachment);
  }

  // GET /proposals/:pid/attachments
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalAttachmentRead, ProposalClass),
  )
  @Get("/:pid/attachments")
  @ApiOperation({
    summary: "It returns all the attachments for the proposal specified.",
    description:
      "It returns all the attachments for the proposal specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Id of the proposal for which we would like to retrieve all the attachments",
    type: String,
  })
  @ApiResponse({
    status: 200,
    type: Attachment,
    isArray: true,
    description:
      "Array with all the attachments associated with the proposal with the pid specified",
  })
  async findAllAttachments(
    @Req() request: Request,
    @Param("pid") proposalId: string,
  ): Promise<OutputAttachmentV3Dto[]> {
    await this.checkPermissionsForProposal(
      request,
      proposalId,
      Action.ProposalAttachmentRead,
    );
    return this.attachmentsService.findAll({ proposalId: proposalId });
  }

  // PATCH /proposals/:pid/attachments/:aid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalAttachmentUpdate, ProposalClass),
  )
  @Patch("/:pid/attachments/:aid")
  @ApiOperation({
    summary: "It updates the attachment specified for the proposal indicated.",
    description:
      "It updates the attachment specified by the aid parameter for the proposal indicated by the pid parameter.<br>This endpoint is obsolete and it will removed in future version.<br>Attachements can be updated from the attachment endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Id of the proposal for which we would like to update the attachment specified",
    type: String,
  })
  @ApiParam({
    name: "aid",
    description:
      "Id of the attachment of this proposal that we would like to patch",
    type: String,
  })
  @ApiResponse({
    status: 200,
    type: Attachment,
    isArray: false,
    description:
      "Update values of the attachment with id specified associated with the proposal with the pid specified",
  })
  async findOneAttachmentAndUpdate(
    @Req() request: Request,
    @Param("pid") proposalId: string,
    @Param("aid") attachmentId: string,
    @Body() updateAttachmentDto: PartialUpdateAttachmentV3Dto,
  ): Promise<OutputAttachmentV3Dto | null> {
    await this.checkPermissionsForProposal(
      request,
      proposalId,
      Action.ProposalAttachmentUpdate,
    );
    return this.attachmentsService.findOneAndUpdate(
      { _id: attachmentId, proposalId: proposalId },
      updateAttachmentDto,
    );
  }

  // DELETE /proposals/:pid/attachments/:aid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalAttachmentDelete, ProposalClass),
  )
  @Delete("/:pid/attachments/:aid")
  @ApiOperation({
    summary: "It deletes the attachment from the proposal.",
    description:
      "It deletes the attachment from the proposal.<br>This endpoint is obsolete and will be dropped in future versions.<br>Deleting attachments will be done only from the attachements endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Id of the proposal for which we would like to delete the attachment specified",
    type: String,
  })
  @ApiParam({
    name: "aid",
    description:
      "Id of the attachment of this proposal that we would like to delete",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description:
      "Remove the attachment with id specified associated with the proposal with the pid specified",
  })
  async findOneAttachmentAndRemove(
    @Req() request: Request,
    @Param("pid") proposalId: string,
    @Param("aid") attachmentId: string,
  ): Promise<unknown> {
    await this.checkPermissionsForProposal(
      request,
      proposalId,
      Action.ProposalAttachmentDelete,
    );
    return this.attachmentsService.findOneAndDelete({
      _id: attachmentId,
      proposalId: proposalId,
    });
  }

  // GET /proposals/:id/datasets
  @UseGuards(PoliciesGuard)
  @CheckPolicies("proposals", (ability: AppAbility) =>
    ability.can(Action.ProposalDatasetRead, ProposalClass),
  )
  @Get("/:pid/datasets")
  @ApiOperation({
    summary:
      "It returns all the datasets associated with the proposal indicated.",
    description:
      "It returns all the datasets associated with the proposal indicated by the pid parameter.<br>Changes to the related datasets must be performed through the dataset endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Id of the proposal for which we would like to retrieve all the datasets",
    type: String,
  })
  @ApiResponse({
    status: 200,
    type: DatasetClass,
    isArray: true,
    description:
      "Array with all the datasets associated with the proposal with the pid specified",
  })
  async findAllDatasets(
    @Req() request: Request,
    @Param("pid") proposalId: string,
  ): Promise<DatasetClass[] | null> {
    const user: JWTUser = request.user as JWTUser;
    const fields: IDatasetFields = JSON.parse("{}");

    const ability = this.caslAbilityFactory.proposalAccess(user);
    const canViewAny = ability.can(Action.AccessAny, DatasetClass);
    const canView = ability.can(Action.DatasetRead, DatasetClass);

    if (!user) {
      fields.isPublished = true;
    } else if (!canViewAny && canView && !fields.isPublished) {
      fields.userGroups = fields.userGroups ?? [];
      fields.userGroups.push(...user.currentGroups);
    }

    const dataset = await this.datasetsService.fullquery({
      where: { proposalId },
      fields: fields,
    });

    return dataset;
  }
}
