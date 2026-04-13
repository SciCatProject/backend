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
  Logger,
  InternalServerErrorException,
  ForbiddenException,
  BadRequestException,
  Req,
  Header,
  NotFoundException,
  Headers,
} from "@nestjs/common";
import { SamplesService } from "./samples.service";
import { CreateSampleDto } from "./dto/create-sample.dto";
import { PartialUpdateSampleDto } from "./dto/update-sample.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiProperty,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import {
  SampleClass,
  SampleDocument,
  SampleWithAttachmentsAndDatasets,
} from "./schemas/sample.schema";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { CreateAttachmentV3Dto } from "src/attachments/dto-obsolete/create-attachment.v3.dto";
import { AttachmentsService } from "src/attachments/attachments.service";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { DatasetsService } from "src/datasets/datasets.service";
import { ISampleFields } from "./interfaces/sample-filters.interface";
import { FormatPhysicalQuantitiesInterceptor } from "src/common/interceptors/format-physical-quantities.interceptor";
import {
  IFilters,
  ILimitsFilter,
} from "src/common/interfaces/common.interface";
import {
  filterDescription,
  filterExample,
  fullQueryDescriptionLimits,
  fullQueryExampleLimits,
  samplesFullQueryDescriptionFields,
  samplesFullQueryExampleFields,
} from "src/common/utils";
import { Request } from "express";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { IDatasetFields } from "src/datasets/interfaces/dataset-filters.interface";
import { CreateSubAttachmentV3Dto } from "src/attachments/dto-obsolete/create-sub-attachment.v3.dto";
import { AuthenticatedPoliciesGuard } from "src/casl/guards/auth-check.guard";
import { CountApiResponse } from "src/common/types";
import { OutputAttachmentV3Dto } from "src/attachments/dto-obsolete/output-attachment.v3.dto";
import { checkUnmodifiedSince } from "src/common/utils/check-unmodified-since";

export class FindByIdAccessResponse {
  @ApiProperty({ type: Boolean })
  canAccess: boolean;
}

@ApiBearerAuth()
@ApiTags("samples")
@Controller("samples")
export class SamplesController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly datasetsService: DatasetsService,
    private readonly samplesService: SamplesService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  private generateSampleInstanceForPermissions(
    sample: SampleClass | CreateSampleDto,
  ): SampleClass {
    const sampleInstance = new SampleClass();
    sampleInstance.accessGroups = sample.accessGroups || [];
    sampleInstance.ownerGroup = sample.ownerGroup || "";
    sampleInstance.sampleId = sample.sampleId || "";
    sampleInstance.isPublished = sample.isPublished || false;

    return sampleInstance;
  }

  private permissionChecker(
    group: Action,
    sample: SampleClass | CreateSampleDto | null,
    request: Request,
  ) {
    if (!sample) {
      return false;
    }

    const sampleInstance = this.generateSampleInstanceForPermissions(sample);

    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.samplesInstanceAccess(user);

    try {
      switch (group) {
        case Action.SampleCreate:
          return (
            ability.can(Action.SampleCreateAny, SampleClass) ||
            ability.can(Action.SampleCreateOwner, sampleInstance)
          );
        case Action.SampleRead:
          return (
            ability.can(Action.SampleReadAny, SampleClass) ||
            ability.can(Action.SampleReadOneOwner, sampleInstance) ||
            ability.can(Action.SampleReadOneAccess, sampleInstance) ||
            ability.can(Action.SampleReadOnePublic, sampleInstance)
          );
        case Action.SampleUpdate:
          return (
            ability.can(Action.SampleUpdateAny, SampleClass) ||
            ability.can(Action.SampleUpdateOwner, sampleInstance)
          );
        case Action.SampleDelete:
          return (
            ability.can(Action.SampleDeleteAny, SampleClass) ||
            ability.can(Action.SampleDeleteOwner, sampleInstance)
          );
        case Action.SampleAttachmentCreate:
          return (
            ability.can(Action.SampleAttachmentCreateAny, SampleClass) ||
            ability.can(Action.SampleAttachmentCreateOwner, sampleInstance)
          );
        case Action.SampleAttachmentRead:
          return (
            ability.can(Action.SampleAttachmentReadAny, SampleClass) ||
            ability.can(Action.SampleAttachmentReadOwner, sampleInstance) ||
            ability.can(Action.SampleAttachmentReadPublic, sampleInstance) ||
            ability.can(Action.SampleAttachmentReadAccess, sampleInstance)
          );
        case Action.SampleAttachmentUpdate:
          return (
            ability.can(Action.SampleAttachmentUpdateAny, SampleClass) ||
            ability.can(Action.SampleAttachmentUpdateOwner, sampleInstance)
          );
        case Action.SampleAttachmentDelete:
          return (
            ability.can(Action.SampleAttachmentDeleteAny, SampleClass) ||
            ability.can(Action.SampleAttachmentDeleteOwner, sampleInstance)
          );

        default:
          Logger.error("Permission for the action is not specified");
          return false;
      }
    } catch (error) {
      throw new InternalServerErrorException(error);
    }
  }

  private async checkPermissionsForSample(
    request: Request,
    id: string,
    group: Action,
  ) {
    const sample = await this.samplesService.findOne({
      sampleId: id,
    });

    if (!sample) {
      throw new NotFoundException(`Sample: ${id} not found`);
    }

    const canDoAction = this.permissionChecker(group, sample, request);

    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized to this sample");
    }

    return sample;
  }

  private checkPermissionsForSampleCreate(
    request: Request,
    sample: CreateSampleDto,
    group: Action,
  ) {
    const canDoAction = this.permissionChecker(group, sample, request);

    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized to create this sample");
    }

    return sample;
  }

  updateFiltersForList(
    request: Request,
    mergedFilters: IFilters<SampleDocument, ISampleFields>,
  ): IFilters<SampleDocument, ISampleFields> {
    const user: JWTUser = request.user as JWTUser;
    //mergedFilters.where = mergedFilters.where || {};
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const authorizationFilter: Record<string, any> = { where: {} };
    if (user) {
      const ability = this.caslAbilityFactory.samplesInstanceAccess(user);
      const canViewAll = ability.can(Action.SampleReadAny, SampleClass);
      if (!canViewAll) {
        const canViewAccess = ability.can(
          Action.SampleReadManyAccess,
          SampleClass,
        );
        const canViewOwner = ability.can(
          Action.SampleReadManyOwner,
          SampleClass,
        );
        const canViewPublic = ability.can(
          Action.SampleReadManyPublic,
          SampleClass,
        );

        if (canViewAccess) {
          authorizationFilter.where["$or"] = [
            { ownerGroup: { $in: user.currentGroups } },
            { accessGroups: { $in: user.currentGroups } },
            { isPublished: true },
          ];
        } else if (canViewOwner) {
          authorizationFilter.where = {
            ownerGroup: { $in: user.currentGroups },
          };
        } else if (canViewPublic) {
          authorizationFilter.where.isPublished = true;
        }
      }
    } else {
      authorizationFilter.where.isPublished = true;
    }
    if (mergedFilters.where) {
      mergedFilters.where = {
        $and: [authorizationFilter.where, mergedFilters.where],
      };
    } else {
      mergedFilters.where = authorizationFilter.where;
    }

    return mergedFilters;
  }
  // POST /samples
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleCreate, SampleClass),
  )
  @UseInterceptors(
    new FormatPhysicalQuantitiesInterceptor<SampleClass>(
      "sampleCharacteristics",
    ),
  )
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({
    summary: "It creates a new sample.",
    description:
      "It creates a new sample and returns it completed with systems fields.",
  })
  @ApiExtraModels(CreateSampleDto)
  @ApiBody({
    type: CreateSampleDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: SampleClass,
    description: "Create a new sample and return its representation in SciCat",
  })
  async create(
    @Req() request: Request,
    @Body() createSampleDto: CreateSampleDto,
  ): Promise<SampleClass> {
    const sampleDTO = this.checkPermissionsForSampleCreate(
      request,
      createSampleDto,
      Action.SampleCreate,
    );

    return this.samplesService.create(sampleDTO);
  }

  // GET /samples
  @UseGuards(PoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleRead, SampleClass),
  )
  @Get()
  @ApiOperation({
    summary: "It returns a list of samples",
    description:
      "It returns a list of samples. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieve samples\n" + filterDescription,
    required: false,
    type: String,
    example: filterExample,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SampleClass,
    isArray: true,
    description: "Return the samples requested",
  })
  async findAll(
    @Req() request: Request,
    @Query("filter") filters?: string,
  ): Promise<SampleClass[]> {
    const sampleFilters: IFilters<SampleDocument, ISampleFields> =
      this.updateFiltersForList(request, JSON.parse(filters ?? "{}"));
    return this.samplesService.findAll(sampleFilters);
  }

  // GET /samples/count
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleRead, SampleClass),
  )
  @Get("/count")
  @ApiOperation({
    summary: "It returns a total count of samples",
    description:
      "It returns a number of samples matching the where filter if provided.",
  })
  @ApiQuery({
    name: "fields",
    description: "Database filters to apply when retrieve samples count",
    required: false,
    type: String,
    example: samplesFullQueryExampleFields,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description: "Return the total count of samples requested",
  })
  async count(
    @Req() request: Request,
    @Query() filters: { fields?: string },
  ): Promise<CountApiResponse> {
    const user: JWTUser = request.user as JWTUser;
    const fields: ISampleFields = JSON.parse(filters.fields ?? "{}");

    const ability = this.caslAbilityFactory.samplesInstanceAccess(user);
    const canViewAll = ability.can(Action.SampleReadAny, SampleClass);

    if (!canViewAll) {
      const canViewAccess = ability.can(
        Action.SampleReadManyAccess,
        SampleClass,
      );
      const canViewOwner = ability.can(Action.SampleReadManyOwner, SampleClass);
      const canViewPublic = ability.can(
        Action.SampleReadManyPublic,
        SampleClass,
      );
      if (canViewAccess) {
        fields.userGroups = fields.userGroups ?? [];
        fields.userGroups.push(...user.currentGroups);
      } else if (canViewOwner) {
        fields.ownerGroup = fields.ownerGroup ?? [];
        fields.ownerGroup.push(...user.currentGroups);
      } else if (canViewPublic) {
        fields.isPublished = true;
      }
    }

    return this.samplesService.count({ fields });
  }

  // GET /samples/fullquery
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleRead, SampleClass),
  )
  @Get("/fullquery")
  @ApiOperation({
    summary: "It returns a list of samples matching the query provided.",
    description:
      "It returns a list of samples matching the query provided.<br>This endpoint still needs some work on the query specification.",
  })
  @ApiQuery({
    name: "fields",
    description:
      "Full query filters to apply when retrieve samples\n" +
      samplesFullQueryDescriptionFields,
    required: false,
    type: String,
    example: samplesFullQueryExampleFields,
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
    type: SampleClass,
    isArray: true,
    description: "Return samples requested",
  })
  async fullquery(
    @Req() request: Request,
    @Query() filters: { fields?: string; limits?: string },
  ): Promise<SampleClass[]> {
    const user: JWTUser = request.user as JWTUser;
    const fields: ISampleFields = JSON.parse(filters.fields ?? "{}");
    const limits: ILimitsFilter = JSON.parse(filters.limits ?? "{}");
    if (user) {
      const ability = this.caslAbilityFactory.samplesInstanceAccess(user);
      const canViewAll = ability.can(Action.SampleReadAny, SampleClass);

      if (!canViewAll) {
        const canViewAccess = ability.can(
          Action.SampleReadManyAccess,
          SampleClass,
        );
        const canViewOwner = ability.can(
          Action.SampleReadManyOwner,
          SampleClass,
        );
        const canViewPublic = ability.can(
          Action.SampleReadManyPublic,
          SampleClass,
        );
        if (canViewAccess) {
          fields.userGroups = fields.userGroups ?? [];
          fields.userGroups.push(...user.currentGroups);
        } else if (canViewOwner) {
          fields.ownerGroup = fields.ownerGroup ?? [];
          fields.ownerGroup.push(...user.currentGroups);
        } else if (canViewPublic) {
          fields.isPublished = true;
        }
      }
    }
    const parsedFilters: IFilters<SampleDocument, ISampleFields> = {
      fields,
      limits,
    };
    return this.samplesService.fullquery(parsedFilters);
  }

  // GET /samples/metadataKeys
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleRead, SampleClass),
  )
  @Get("/metadataKeys")
  @ApiOperation({
    summary:
      "It returns a list of sample metadata keys matching the query provided.",
    description:
      "It returns a list of sample metadata keys matching the query provided.",
  })
  @ApiQuery({
    name: "fields",
    description:
      "Define the filter conditions by specifying the name of values of fields requested. ",
    required: false,
    type: String,
    example: {},
  })
  @ApiQuery({
    name: "limits",
    description: "Define further query parameters like skip, limit, order",
    required: false,
    type: String,
    example: '{ "skip": 0, "limit": 25, "order": "creationTime:desc" }',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: String,
    isArray: true,
    description: "Return sample metadata keys requested",
  })
  async metadataKeys(
    @Req() request: Request,
    @Query() filters: { fields?: string; limits?: string },
  ): Promise<string[]> {
    const user: JWTUser = request.user as JWTUser;

    const fields: ISampleFields = JSON.parse(filters.fields ?? "{}");
    const limits: ILimitsFilter = JSON.parse(filters.limits ?? "{}");
    if (user) {
      const ability = this.caslAbilityFactory.samplesInstanceAccess(user);
      const canViewAll = ability.can(Action.SampleReadAny, SampleClass);

      if (!canViewAll) {
        const canViewAccess = ability.can(
          Action.SampleReadManyAccess,
          SampleClass,
        );
        const canViewOwner = ability.can(
          Action.SampleReadManyOwner,
          SampleClass,
        );
        const canViewPublic = ability.can(
          Action.SampleReadManyPublic,
          SampleClass,
        );
        if (canViewAccess) {
          fields.userGroups = fields.userGroups ?? [];
          fields.userGroups.push(...user.currentGroups);
        } else if (canViewOwner) {
          fields.ownerGroup = fields.ownerGroup ?? [];
          fields.ownerGroup.push(...user.currentGroups);
        } else if (canViewPublic) {
          fields.isPublished = true;
        }
      }
    }
    const parsedFilters: IFilters<SampleDocument, ISampleFields> = {
      fields,
      limits,
    };

    return this.samplesService.metadataKeys(parsedFilters);
  }

  // GET /samples/findOne
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleRead, SampleClass),
  )
  @Get("/findOne")
  @ApiOperation({
    summary: "It returns a sample matching the query provided.",
    description: "It returns sample matching the query provided.",
  })
  @ApiQuery({
    name: "filter",
    description: "Filters to apply when retrieve sample\n" + filterDescription,
    required: false,
    type: String,
    example: filterExample,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SampleWithAttachmentsAndDatasets,
    description: "Return sample requested",
  })
  async findOne(
    @Query("filter") queryFilters?: string,
  ): Promise<SampleWithAttachmentsAndDatasets | null> {
    const jsonFilters: IFilters<SampleDocument, ISampleFields> = queryFilters
      ? JSON.parse(queryFilters)
      : {};
    const whereFilters = jsonFilters.where ?? {};

    const sample = (
      await this.samplesService.findOne(whereFilters)
    )?.toObject() as SampleWithAttachmentsAndDatasets;

    if (sample) {
      const includeFilters = jsonFilters.include ?? [];
      await Promise.all(
        includeFilters.map(async ({ relation }) => {
          switch (relation) {
            case "attachments": {
              sample.attachments = await this.attachmentsService.findAll({
                sampleId: sample.sampleId,
              });
              break;
            }
            case "datasets": {
              sample.datasets = await this.datasetsService.findAll({
                where: { sampleId: sample.sampleId },
              });
              break;
            }
          }
        }),
      );
    }

    return sample;
  }

  // GET /samples/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleRead, SampleClass),
  )
  @Get("/:id")
  @Header("content-type", "application/json")
  @ApiOperation({
    summary: "It returns the sample requested.",
    description: "It returns the sample requested through the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the sample to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SampleClass,
    description: "Return sample with id specified",
  })
  async findById(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<SampleClass | null> {
    const sample = await this.checkPermissionsForSample(
      request,
      id,
      Action.SampleRead,
    );

    return sample;
  }

  // GET /samples/:id/authorization
  @UseGuards(PoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleRead, SampleClass),
  )
  @Get("/:id/authorization")
  @ApiParam({
    name: "id",
    description: "ID of the sample to check access for",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FindByIdAccessResponse,
    description:
      "Returns canAccess property with boolean true if the user has access to the specified sample, otherwise false.",
  })
  async findByIdAccess(@Req() request: Request, @Param("id") id: string) {
    const sample = await this.samplesService.findOne({
      sampleId: id,
    });

    const canAccess = this.permissionChecker(
      Action.SampleRead,
      sample,
      request,
    );
    return { canAccess };
  }

  // PATCH /samples/:id
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleUpdate, SampleClass),
  )
  @UseInterceptors(
    new FormatPhysicalQuantitiesInterceptor<SampleClass>(
      "sampleCharacteristics",
    ),
  )
  @Patch("/:id")
  @ApiOperation({
    summary: "It updates the sample.",
    description:
      "It updates the sample specified through the id specified. it updates only the specified fields.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the sample to modify",
    type: String,
  })
  @ApiExtraModels(PartialUpdateSampleDto)
  @ApiBody({
    type: PartialUpdateSampleDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: SampleClass,
    description:
      "Update an existing sample and return its representation in SciCat",
  })
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updateSampleDto: PartialUpdateSampleDto,
    @Headers() headers: Record<string, string>,
  ): Promise<SampleClass | null> {
    const sample = await this.checkPermissionsForSample(
      request,
      id,
      Action.SampleUpdate,
    );

    //checks if the resource is unmodified since clients timestamp
    checkUnmodifiedSince(sample.updatedAt, headers["if-unmodified-since"]);

    return this.samplesService.update({ sampleId: id }, updateSampleDto);
  }

  // DELETE /samples/:id
  @UseGuards()
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleDelete, SampleClass),
  )
  @Delete("/:id")
  @ApiOperation({
    summary: "It deletes the sample.",
    description: "It delete the sample specified through the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the sample to delete",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "No value is returned",
  })
  async remove(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<unknown> {
    await this.checkPermissionsForSample(request, id, Action.SampleDelete);
    return this.samplesService.remove({ sampleId: id });
  }

  // POST /samples/:id/attachments
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleAttachmentDelete, SampleClass),
  )
  @Post("/:id/attachments")
  @ApiOperation({
    summary: "It creates a new attachment related with this sample.",
    description:
      "It creates a new attachment related to the sample id provided and returns it completed with system fields.",
  })
  @ApiExtraModels(CreateAttachmentV3Dto)
  @ApiBody({
    type: CreateSubAttachmentV3Dto,
  })
  @ApiParam({
    name: "id",
    description: "Sample id that this attachment will be related to.",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: Attachment,
    description:
      "Create a new attachment related to sample id provided and return its representation in SciCat",
  })
  async createAttachments(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() createAttachmentDto: CreateSubAttachmentV3Dto,
  ): Promise<OutputAttachmentV3Dto | null> {
    const sample = await this.checkPermissionsForSample(
      request,
      id,
      Action.SampleAttachmentCreate,
    );
    if (!sample) {
      throw new BadRequestException(
        "Not able to create attachment for this sample",
      );
    }
    const createAttachment: CreateAttachmentV3Dto = {
      ...createAttachmentDto,
      sampleId: id,
      ownerGroup: sample.ownerGroup,
      accessGroups: sample.accessGroups,
    };
    const createdAttachment =
      await this.attachmentsService.create(createAttachment);
    return createdAttachment;
  }

  // GET /samples/:id/attachments
  @UseGuards(PoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleAttachmentRead, SampleClass),
  )
  @Get("/:id/attachments")
  @ApiOperation({
    summary: "It returns the attachments related to a specific sample.",
    description:
      "It returns the attachments related to a sample through the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the sample to get attachments related.",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
    type: Attachment,
    description: "Return attachments related with sample id specified",
  })
  async findAllAttachments(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<OutputAttachmentV3Dto[]> {
    await this.checkPermissionsForSample(
      request,
      id,
      Action.SampleAttachmentRead,
    );
    return this.attachmentsService.findAll({ sampleId: id });
  }

  // GET /samples/:id/attachments/:fk
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleAttachmentRead, SampleClass),
  )
  @Get("/:id/attachments/:fk")
  @ApiOperation({
    summary: "It returns the attachment related to a specific sample.",
    description:
      "It returns the attachment related to a sample through the sample and attachment ids specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the sample to get attachments related.",
    type: String,
  })
  @ApiParam({
    name: "fk",
    description: "Id of the specific attachment to get.",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Attachment,
    description:
      "Return one specific attachment by id(fk) related to specified sample id.",
  })
  async findOneAttachment(
    @Req() request: Request,
    @Param("id") id: string,
    @Param("fk") attachmentId: string,
  ): Promise<OutputAttachmentV3Dto | null> {
    await this.checkPermissionsForSample(
      request,
      id,
      Action.SampleAttachmentRead,
    );
    return this.attachmentsService.findOne({
      id: attachmentId,
      sampleId: id,
    });
  }

  // DELETE /samples/:id/attachments/:fk
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleAttachmentDelete, SampleClass),
  )
  @Delete("/:id/attachments/:fk")
  @ApiOperation({
    summary: "It deletes the attachment related to a specific sample.",
    description:
      "It deletes the attachment specified through the id(fk) related to specific sample.",
  })
  @ApiParam({
    name: "id",
    description:
      "Id of the sample that this specific attachment is related with",
    type: String,
  })
  @ApiParam({
    name: "fk",
    description: "Id of the attachment to delete",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "No value is returned",
  })
  async findOneAttachmentAndRemove(
    @Req() request: Request,
    @Param("id") id: string,
    @Param("fk") attachmentId: string,
  ): Promise<unknown> {
    await this.checkPermissionsForSample(
      request,
      id,
      Action.SampleAttachmentDelete,
    );
    return this.attachmentsService.findOneAndDelete({
      _id: attachmentId,
      sampleId: id,
    });
  }

  // POST /samples/:id/datasets
  /*   @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) => ability.can(Action.Create, Dataset))
  @Post("/:id/datasets")
  async createDataset(
    @Param("id") id: string,
    @Body() createRawDatasetDto: CreateRawDatasetDto,
  ): Promise<Dataset> {
    const createDataset = { ...createRawDatasetDto, sampleId: id };
    return this.datasetsService.create(createDataset);
  }
 */

  // GET /samples/:id/datasets
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) =>
    ability.can(Action.SampleDatasetRead, SampleClass),
  )
  @Get("/:id/datasets")
  @ApiOperation({
    summary: "It returns the datasets related to a specific sample.",
    description:
      "It returns the datasets related to a sample through the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the sample to get datasets related.",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: true,
    type: DatasetClass,
    description: "Return all datasets related with sample id specified",
  })
  async findAllDatasets(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<DatasetClass[] | null> {
    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.samplesInstanceAccess(user);
    const canViewAny = ability.can(Action.DatasetReadAny, DatasetClass);
    const fields: IDatasetFields = JSON.parse("{}");

    if (!canViewAny) {
      const canViewAccess = ability.can(
        Action.DatasetReadManyAccess,
        DatasetClass,
      );
      const canViewOwner = ability.can(
        Action.DatasetReadManyOwner,
        DatasetClass,
      );
      const canViewPublic = ability.can(
        Action.DatasetReadManyPublic,
        DatasetClass,
      );
      if (canViewAccess) {
        fields.userGroups = user.currentGroups ?? [];
        fields.userGroups.push(...user.currentGroups);
        // fields.sharedWith = user.email;
      } else if (canViewOwner) {
        fields.ownerGroup = user.currentGroups ?? [];
        fields.ownerGroup.push(...user.currentGroups);
      } else if (canViewPublic) {
        fields.isPublished = true;
      }
    }

    const dataset = await this.datasetsService.fullquery({
      where: { sampleId: id },
      fields: fields,
    });
    return dataset;
  }

  // PATCH /samples/:id/datasets/:fk
  /* @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) => ability.can(Action.Update, Dataset))
  @Patch("/:id/datasets/:fk")
  async findOneDatasetAndUpdate(
    @Param("id") sampleId: string,
    @Param("fk") datasetId: string,
    @Body() updateRawDatasetDto: UpdateRawDatasetDto,
  ): Promise<Dataset | null> {
    return this.datasetsService.findByIdAndUpdate(
      datasetId,
      updateRawDatasetDto,
    );
  } */

  // DELETE /samples/:id/datasets/:fk
  /*   @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("samples", (ability: AppAbility) => ability.can(Action.Delete, Dataset))
  @Delete("/:id/datasets/:fk")
  async findOneDatasetAndRemove(
    @Param("id") sampleId: string,
    @Param("fk") datasetId: string,
  ): Promise<unknown> {
    return this.datasetsService.findByIdAndDelete(datasetId);
  }
 */
}
