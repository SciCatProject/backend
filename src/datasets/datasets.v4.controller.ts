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
import { FormatPhysicalQuantitiesInterceptor } from "src/common/interceptors/format-physical-quantities.interceptor";
import { UTCTimeInterceptor } from "src/common/interceptors/utc-time.interceptor";
import { IFacets, IFilters } from "src/common/interfaces/common.interface";
import { IsRecord, IsValueUnitObject } from "../common/utils";
import { DatasetsService } from "./datasets.service";
import { SubDatasetsPublicInterceptor } from "./interceptors/datasets-public.interceptor";
import {
  IDatasetFields,
  IDatasetFiltersV4,
} from "./interfaces/dataset-filters.interface";
import { DatasetClass, DatasetDocument } from "./schemas/dataset.schema";

import { plainToInstance } from "class-transformer";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import {
  CountApiResponse,
  FullFacetFilters,
  FullFacetResponse,
  IsValidResponse,
} from "src/common/types";
import { LogbooksService } from "src/logbooks/logbooks.service";
import { Logbook } from "src/logbooks/schemas/logbook.schema";
import { CreateDatasetDto } from "./dto/create-dataset.dto";
import {
  OutputDatasetDto,
  PartialOutputDatasetDto,
} from "./dto/output-dataset.dto";
import {
  PartialUpdateDatasetDto,
  PartialUpdateDatasetLifecycleDto,
  UpdateDatasetDto,
  UpdateDatasetLifecycleDto,
} from "./dto/update-dataset.dto";
import {
  DatasetLookupKeysEnum,
  DATASET_LOOKUP_FIELDS,
  ALLOWED_DATASET_KEYS,
  ALLOWED_DATASET_FILTER_KEYS,
} from "./types/dataset-lookup";
import { IncludeValidationPipe } from "src/common/pipes/include-validation.pipe";
import { PidValidationPipe } from "./pipes/pid-validation.pipe";
import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import { getSwaggerDatasetFilterContent } from "./types/dataset-filter-content";

import { ScientificMetadataValidationPipe } from "./pipes/scientific-metadata-validation.pipe";
import { HistoryClass } from "./schemas/history.schema";
import { LifecycleClass } from "./schemas/lifecycle.schema";
import { RelationshipClass } from "./schemas/relationship.schema";
import { TechniqueClass } from "./schemas/technique.schema";
import { checkUnmodifiedSince } from "src/common/utils/check-unmodified-since";

@ApiBearerAuth()
@ApiExtraModels(
  CreateDatasetDto,
  HistoryClass,
  TechniqueClass,
  RelationshipClass,
)
@ApiTags("datasets v4")
/* NOTE: Generated SDK method names include "V4" twice:
 *  - From the controller class name (DatasetsV4Controller)
 *  - From the route version (`version: '4'`)
 * This is intentional for versioned routing.
 */
@Controller({ path: "datasets", version: "4" })
export class DatasetsV4Controller {
  constructor(
    private datasetsService: DatasetsService,
    private caslAbilityFactory: CaslAbilityFactory,
    private logbooksService: LogbooksService,
  ) {}

  async generateDatasetInstanceForPermissions(
    dataset: DatasetClass | CreateDatasetDto,
  ): Promise<DatasetClass> {
    // NOTE: We need DatasetClass instance because casl module can not recognize the type from dataset mongo database model. If other fields are needed can be added later.
    const datasetInstance = new DatasetClass();
    datasetInstance._id = "";
    datasetInstance.pid = dataset.pid || "";
    datasetInstance.accessGroups = dataset.accessGroups || [];
    datasetInstance.ownerGroup = dataset.ownerGroup;
    datasetInstance.sharedWith = dataset.sharedWith;
    datasetInstance.isPublished = dataset.isPublished || false;

    return datasetInstance;
  }

  async checkPermissionsForDatasetExtended(
    request: Request,
    datasetInput: CreateDatasetDto | string | null,
    group: Action,
  ) {
    if (!datasetInput) {
      throw new NotFoundException(`dataset: ${datasetInput} not found`);
    }

    let dataset = null;

    if (typeof datasetInput === "string") {
      dataset = await this.datasetsService.findOne({
        where: { pid: datasetInput },
      });

      if (!dataset) {
        throw new NotFoundException(`dataset: ${datasetInput} not found`);
      }
    } else {
      dataset = datasetInput;
    }
    const user: JWTUser = request.user as JWTUser;

    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(dataset);

    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);

    let canDoAction = false;

    if (group == Action.DatasetRead) {
      canDoAction =
        ability.can(Action.DatasetReadAny, DatasetClass) ||
        ability.can(Action.DatasetReadOneOwner, datasetInstance) ||
        ability.can(Action.DatasetReadOneAccess, datasetInstance) ||
        ability.can(Action.DatasetReadOnePublic, datasetInstance);
    } else if (group == Action.DatasetCreate) {
      canDoAction =
        ability.can(Action.DatasetCreateAny, DatasetClass) ||
        ability.can(Action.DatasetCreateOwnerNoPid, datasetInstance) ||
        ability.can(Action.DatasetCreateOwnerWithPid, datasetInstance);
    } else if (group == Action.DatasetUpdate) {
      canDoAction =
        ability.can(Action.DatasetUpdateAny, DatasetClass) ||
        ability.can(Action.DatasetUpdateOwner, datasetInstance) ||
        ability.can(Action.DatasetLifecycleUpdate, datasetInstance);
    } else if (group == Action.DatasetLifecycleUpdate) {
      canDoAction =
        ability.can(Action.DatasetUpdateAny, DatasetClass) ||
        ability.can(Action.DatasetUpdateOwner, datasetInstance) ||
        ability.can(Action.DatasetLifecycleUpdateAny, datasetInstance);
    } else if (group == Action.DatasetDelete) {
      canDoAction =
        ability.can(Action.DatasetDeleteAny, DatasetClass) ||
        ability.can(Action.DatasetDeleteOwner, datasetInstance);
    } else if (group == Action.DatasetAttachmentRead) {
      canDoAction =
        ability.can(Action.DatasetAttachmentReadAny, DatasetClass) ||
        ability.can(Action.DatasetAttachmentReadOwner, datasetInstance) ||
        ability.can(Action.DatasetAttachmentReadAccess, datasetInstance) ||
        ability.can(Action.DatasetAttachmentReadPublic, datasetInstance);
    } else if (group == Action.DatasetOrigdatablockRead) {
      canDoAction =
        ability.can(Action.DatasetOrigdatablockReadAny, DatasetClass) ||
        ability.can(Action.DatasetOrigdatablockReadOwner, datasetInstance) ||
        ability.can(Action.DatasetOrigdatablockReadAccess, datasetInstance) ||
        ability.can(Action.DatasetOrigdatablockReadPublic, datasetInstance);
    } else if (group == Action.DatasetDatablockRead) {
      canDoAction =
        ability.can(Action.DatasetOrigdatablockReadAny, DatasetClass) ||
        ability.can(Action.DatasetDatablockReadOwner, datasetInstance) ||
        ability.can(Action.DatasetDatablockReadAccess, datasetInstance) ||
        ability.can(Action.DatasetDatablockReadPublic, datasetInstance);
    } else if (group == Action.DatasetLogbookRead) {
      canDoAction =
        ability.can(Action.DatasetLogbookReadAny, DatasetClass) ||
        ability.can(Action.DatasetLogbookReadOwner, datasetInstance);
    }
    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized access");
    }

    return dataset;
  }

  addAccessBasedFilters(
    user: JWTUser,
    filter: IDatasetFiltersV4<DatasetDocument, IDatasetFields>,
  ): IDatasetFiltersV4<DatasetDocument, IDatasetFields> {
    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    const canViewAny = ability.can(Action.DatasetReadAny, DatasetClass);
    const canViewOwner = ability.can(Action.DatasetReadManyOwner, DatasetClass);
    const canViewAccess = ability.can(
      Action.DatasetReadManyAccess,
      DatasetClass,
    );

    if (!filter.where) {
      filter.where = {};
    }

    if (!canViewAny) {
      if (canViewAccess) {
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
      } else if (canViewOwner) {
        filter.where = {
          ...filter.where,
          ownerGroup: { $in: user.currentGroups },
        };
      }
    }

    return filter;
  }

  findInvalidValueUnitUpdates(
    updateDto: Record<string, unknown>,
    dataset: Record<string, unknown>,
    path: string[] = [],
  ): string[] {
    // collect properties that have both 'value' and 'unit' in original dataset but one of either is missing in the updateDto body
    const unmatched: string[] = [];

    for (const key in updateDto) {
      const value = updateDto[key];
      const currentPath = [...path, key];
      if (IsValueUnitObject(value)) {
        const datasetAtKey = currentPath.reduce<unknown>(
          (obj, k) => (IsRecord(obj) ? obj[k] : undefined),
          dataset,
        );
        if (IsValueUnitObject(datasetAtKey)) {
          // check if current object's 'value' or 'unit' are not undefined in original dataset and passed updateDto
          const originalHasValue = datasetAtKey.value !== undefined;
          const originalHasUnit = datasetAtKey.unit !== undefined;
          const updateHasValue = value.value !== undefined;
          const updateHasUnit = value.unit !== undefined;
          if (
            originalHasValue &&
            originalHasUnit &&
            !(updateHasValue && updateHasUnit)
          ) {
            unmatched.push(currentPath.join("."));
          }
        }
      }
      // recursively go through the (scientificMetadata) object
      if (IsRecord(value)) {
        unmatched.push(
          ...this.findInvalidValueUnitUpdates(value, dataset, currentPath),
        );
      }
    }
    return unmatched;
  }

  // POST /api/v4/datasets
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetCreate, DatasetClass),
  )
  @UseInterceptors(
    new UTCTimeInterceptor<DatasetClass>(["creationTime"]),
    new UTCTimeInterceptor<DatasetClass>(["endTime"]),
    new FormatPhysicalQuantitiesInterceptor<DatasetClass>("scientificMetadata"),
  )
  @UsePipes(ScientificMetadataValidationPipe)
  @Post()
  @ApiOperation({
    summary:
      "It creates a new dataset. Type should be raw, derived or any of the customized types available in your instance",
    description:
      "It creates a new dataset and returns it completed with systems fields.",
  })
  @ApiBody({
    description: "Input fields for the dataset to be created",
    required: true,
    type: CreateDatasetDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: OutputDatasetDto,
    description: "Create a new dataset and return its representation in SciCat",
  })
  async create(
    @Req() request: Request,
    @Body(PidValidationPipe)
    createDatasetDto: CreateDatasetDto,
  ): Promise<OutputDatasetDto> {
    const datasetDto = await this.checkPermissionsForDatasetExtended(
      request,
      createDatasetDto,
      Action.DatasetCreate,
    );

    try {
      const createdDataset = await this.datasetsService.create(datasetDto);

      return createdDataset;
    } catch (error) {
      if ((error as MongoError).code === 11000) {
        throw new ConflictException(
          `A dataset with pid ${datasetDto.pid?.trim() ? datasetDto.pid : "unknown"} already exists!`,
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
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetCreate, DatasetClass),
  )
  @UseInterceptors(
    new UTCTimeInterceptor<DatasetClass>(["creationTime"]),
    new UTCTimeInterceptor<DatasetClass>(["endTime"]),
    new FormatPhysicalQuantitiesInterceptor<DatasetClass>("scientificMetadata"),
  )
  @HttpCode(HttpStatus.OK)
  @Post("/isValid")
  @ApiOperation({
    summary: "It validates the dataset provided as input.",
    description:
      "It validates the dataset provided as input, and returns true if the information is a valid dataset",
  })
  @ApiBody({
    description: "Input fields for the dataset that needs to be validated",
    required: true,
    type: CreateDatasetDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IsValidResponse,
    description:
      "Check if the dataset provided pass validation. It return true if the validation is passed",
  })
  async isValid(
    @Req() request: Request,
    @Body(PidValidationPipe)
    createDatasetDto: object,
  ): Promise<IsValidResponse> {
    const createDatasetDtoInstance = plainToInstance(
      CreateDatasetDto,
      createDatasetDto,
    );

    const datasetDto = await this.checkPermissionsForDatasetExtended(
      request,
      createDatasetDtoInstance,
      Action.DatasetCreate,
    );

    const errors = await validate(datasetDto);

    const valid = errors.length === 0;

    return { valid: valid };
  }

  // GET /datasets
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  @Get()
  @ApiOperation({
    summary: "It returns a list of datasets.",
    description:
      "It returns a list of datasets. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving datasets <br> ⚠️ Do not include both a parent field (e.g. 'proposals') and its subfields (e.g. 'proposals.type') in the same request, as this will cause a path collision error. ",
    required: false,
    type: String,
    content: getSwaggerDatasetFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartialOutputDatasetDto,
    isArray: true,
    description: "Return the datasets requested",
  })
  async findAll(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_DATASET_KEYS,
        ALLOWED_DATASET_FILTER_KEYS,
      ),
      new IncludeValidationPipe(DATASET_LOOKUP_FIELDS),
    )
    queryFilter: string,
  ): Promise<PartialOutputDatasetDto[]> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    const mergedFilters = this.addAccessBasedFilters(
      request.user as JWTUser,
      parsedFilter,
    );

    const datasets = await this.datasetsService.findAllComplete(mergedFilters);

    return datasets;
  }

  // GET /fullfacets
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  @UseInterceptors(SubDatasetsPublicInterceptor)
  @Get("/fullfacet")
  @ApiQuery({
    name: "filters",
    description:
      "Defines list of field names, for which facet counts should be calculated",
    required: false,
    type: FullFacetFilters,
    example:
      '{"facets": ["type","creationLocation","ownerGroup","keywords"], fields: {}}',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FullFacetResponse,
    isArray: true,
    description: "Return fullfacet response for datasets requested",
  })
  async fullfacet(
    @Req() request: Request,
    @Query() filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    const user: JWTUser = request.user as JWTUser;
    const fields: IDatasetFields = JSON.parse(filters.fields ?? "{}");

    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    const canViewAny = ability.can(Action.DatasetReadAny, DatasetClass);

    if (!canViewAny && !fields.isPublished) {
      const canViewAccess = ability.can(
        Action.DatasetReadManyAccess,
        DatasetClass,
      );
      const canViewOwner = ability.can(
        Action.DatasetReadManyOwner,
        DatasetClass,
      );

      if (canViewAccess) {
        fields.userGroups = fields.userGroups ?? [];
        fields.userGroups.push(...user.currentGroups);
      } else if (canViewOwner) {
        fields.ownerGroup = fields.ownerGroup ?? [];
        fields.ownerGroup.push(...user.currentGroups);
      }
    }

    const parsedFilters: IFacets<IDatasetFields> = {
      fields: fields,
      facets: JSON.parse(filters.facets ?? "[]"),
    };

    return this.datasetsService.fullFacet(parsedFilters);
  }

  // GET /datasets/metadataKeys
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  @UseInterceptors(SubDatasetsPublicInterceptor)
  @Get("/metadataKeys")
  @ApiOperation({
    summary:
      "It returns a list of metadata keys contained in the datasets matching the filter provided.",
    description:
      "It returns a list of metadata keys contained in the datasets matching the filter provided.<br>This endpoint still needs some work on the filter and facets specification.",
  })
  @ApiQuery({
    name: "fields",
    description:
      "Define the filter conditions by specifying the name of values of fields requested. There is also support for a `text` search to look for strings anywhere in the dataset.",
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
    description: "Return metadata keys for list of datasets selected",
  })
  // NOTE: This one needs to be discussed as well but it gets the metadata keys from the dataset but it doesnt do it with the nested fields. Think about it
  async metadataKeys(
    @Req() request: Request,
    @Query() filters: { fields?: string; limits?: string },
  ) {
    const user: JWTUser = request.user as JWTUser;
    const fields: IDatasetFields = JSON.parse(filters.fields ?? "{}");

    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    const canViewAny = ability.can(Action.DatasetReadAny, DatasetClass);

    if (!canViewAny && !fields.isPublished) {
      const canViewAccess = ability.can(
        Action.DatasetReadManyAccess,
        DatasetClass,
      );
      const canViewOwner = ability.can(
        Action.DatasetReadManyOwner,
        DatasetClass,
      );

      if (canViewAccess) {
        fields.userGroups?.push(...user.currentGroups);
      } else if (canViewOwner) {
        fields.ownerGroup?.push(...user.currentGroups);
      }
    }

    const parsedFilters: IFilters<DatasetDocument, IDatasetFields> = {
      fields: fields,
      limits: JSON.parse(filters.limits ?? "{}"),
    };
    return this.datasetsService.metadataKeys(parsedFilters);
  }

  // GET /datasets/findOne
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  @Get("/findOne")
  @ApiOperation({
    summary: "It returns the first dataset found.",
    description:
      "It returns the first dataset of the ones that matches the filter provided. The list returned can be modified by providing a filter.<br> ⚠️ Do not include both a parent field (e.g. 'proposals') and its subfields (e.g. 'proposals.type') in the same request, as this will cause a path collision error.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving dataset",
    required: true,
    type: String,
    content: getSwaggerDatasetFilterContent({
      where: true,
      include: true,
      fields: true,
      limits: true,
    }),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetDto,
    description: "Return the datasets requested",
  })
  async findOne(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_DATASET_KEYS,
        ALLOWED_DATASET_FILTER_KEYS,
      ),
      new IncludeValidationPipe(DATASET_LOOKUP_FIELDS),
    )
    queryFilter: string,
  ): Promise<OutputDatasetDto | null> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");

    const mergedFilters = this.addAccessBasedFilters(
      request.user as JWTUser,
      parsedFilter,
    );

    return this.datasetsService.findOneComplete(mergedFilters);
  }

  // GET /datasets/count
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  @Get("/count")
  @ApiOperation({
    summary: "It returns the number of datasets.",
    description:
      "It returns a number of datasets matching the where filter if provided.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving count for datasets",
    required: false,
    type: String,
    content: getSwaggerDatasetFilterContent({
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
      "Return the number of datasets in the following format: { count: integer }",
  })
  async count(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_DATASET_KEYS,
        ALLOWED_DATASET_FILTER_KEYS,
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

    return this.datasetsService.count(finalFilters);
  }

  // GET /datasets/:id
  //@UseGuards(PoliciesGuard)
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  @Get("/:pid")
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetDto,
    isArray: false,
    description: "Return dataset with pid specified",
  })
  @ApiQuery({
    name: "include",
    enum: DatasetLookupKeysEnum,
    type: String,
    required: false,
    isArray: true,
  })
  async findById(
    @Req() request: Request,
    @Param("pid") id: string,
    @Query("include", new IncludeValidationPipe(DATASET_LOOKUP_FIELDS))
    include: DatasetLookupKeysEnum[] | DatasetLookupKeysEnum,
  ) {
    const includeArray = Array.isArray(include)
      ? include
      : include && Array(include);

    const dataset = await this.datasetsService.findOneComplete({
      where: { pid: id },
      include: includeArray,
    });

    await this.checkPermissionsForDatasetExtended(
      request,
      dataset,
      Action.DatasetRead,
    );

    return dataset;
  }

  // PATCH /datasets/:id
  // body: modified fields
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetUpdate, DatasetClass),
  )
  @UseInterceptors(
    new UTCTimeInterceptor<DatasetClass>(["creationTime"]),
    new UTCTimeInterceptor<DatasetClass>(["endTime"]),
    new FormatPhysicalQuantitiesInterceptor<DatasetClass>("scientificMetadata"),
  )
  @UsePipes(ScientificMetadataValidationPipe)
  @Patch("/:pid")
  @ApiOperation({
    summary: "It partially updates the dataset.",
    description: `It updates the dataset through the pid specified. It updates only the specified fields.
Set \`content-type\` header to \`application/merge-patch+json\` if you would like to update nested objects.

- In \`application/json\`, setting a property to \`null\` means "do not change this value."
- In \`application/merge-patch+json\`, setting a property to \`null\` means "reset this value to \`null\`" (or the default value, if one is defined).

**Caution:** \`application/merge-patch+json\` doesn't support updating a specific item in an array — the result will always replace the entire target if it's not an object.`,
  })
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to modify",
    type: String,
  })
  @ApiConsumes("application/merge-patch+json", "application/json")
  @ApiBody({
    description:
      "Fields that needs to be updated in the dataset. Only the fields that needs to be updated have to be passed in.",
    required: true,
    type: PartialUpdateDatasetDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetDto,
    description:
      "Update an existing dataset and return its representation in SciCat",
  })
  async findByIdAndUpdate(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body()
    updateDatasetDto: PartialUpdateDatasetDto,
  ): Promise<OutputDatasetDto | null> {
    const foundDataset = await this.datasetsService.findOne({
      where: { pid },
    });

    if (!foundDataset) throw new NotFoundException("Dataset not found");

    await this.checkPermissionsForDatasetExtended(
      request,
      foundDataset,
      Action.DatasetUpdate,
    );

    //checks if the resource is unmodified since clients timestamp
    checkUnmodifiedSince(
      foundDataset.updatedAt,
      request.headers["if-unmodified-since"],
    );

    if (foundDataset && IsRecord(updateDatasetDto) && IsRecord(foundDataset)) {
      const mismatchedPaths = this.findInvalidValueUnitUpdates(
        updateDatasetDto,
        foundDataset,
      );
      if (mismatchedPaths.length > 0) {
        throw new BadRequestException(
          `Original dataset ${pid} contains both value and unit in ${mismatchedPaths.join(", ")}. Please provide both when updating.`,
        );
      }
    } else {
      throw new BadRequestException(
        `Failed to compare scientific metadata to include both value and units`,
      );
    }
    const updateDatasetDtoForService =
      request.headers["content-type"] === "application/merge-patch+json"
        ? jmp.apply(foundDataset, updateDatasetDto)
        : updateDatasetDto;
    const updatedDataset = await this.datasetsService.findByIdAndUpdate(
      pid,
      updateDatasetDtoForService,
    );
    return updatedDataset;
  }

  // GET /datasets/:id/datasetlifecycle
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetRead, DatasetClass),
  )
  @Get("/:pid/datasetlifecycle")
  @ApiOperation({
    summary: "It returns dataset lifecycle.",
    description:
      "It return the dataset lifecycle of the dataset pid specified.",
  })
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UpdateDatasetLifecycleDto,
    isArray: false,
    description: "Return dataset lifecycle of the dataset with pid specified",
  })
  async findLifecycleById(@Req() request: Request, @Param("pid") id: string) {
    const dataset = await this.datasetsService.findOneComplete({
      where: { pid: id },
    });

    await this.checkPermissionsForDatasetExtended(
      request,
      dataset,
      Action.DatasetRead,
    );

    return dataset?.datasetlifecycle;
  }

  // PATCH /datasets/:id/datasetlifecycle
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetLifecycleUpdate, DatasetClass),
  )
  @UseInterceptors(
    new UTCTimeInterceptor<DatasetClass>(["creationTime"]),
    new UTCTimeInterceptor<DatasetClass>(["endTime"]),
  )
  @Patch("/:pid/datasetlifecycle")
  @ApiOperation({
    summary: "It updates dataset lifecycle of the dataset.",
    description:
      "It updates the dataset lifecycle through the pid specified. It updates only the specified fields. Setting a property to \`null\` means reset this value default.",
  })
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to modify",
    type: String,
  })
  @ApiConsumes("application/merge-patch+json")
  @ApiBody({
    description:
      "Dataset lifecycle fields that need to be updated in the dataset. Only the fields that need to be updated have to be passed in.",
    required: true,
    type: PartialUpdateDatasetLifecycleDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UpdateDatasetLifecycleDto,
    description:
      "Update an existing dataset's lifecycle and return the whole datasetlifecycle of the dataset representation in SciCat",
  })
  async findByIdAndUpdateLifecycle(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body()
    updateDatasetLifecycleDto: PartialUpdateDatasetLifecycleDto,
  ): Promise<LifecycleClass | null> {
    const isEmpty = Object.values(updateDatasetLifecycleDto).every(
      (value) => value === undefined,
    );

    if (isEmpty) {
      throw new BadRequestException("dataset lifecycle DTO must not be empty");
    }

    const foundDataset = await this.datasetsService.findOne({
      where: { pid },
    });
    if (!foundDataset) {
      throw new NotFoundException(`dataset with pid ${pid} not found`);
    }
    await this.checkPermissionsForDatasetExtended(
      request,
      foundDataset,
      Action.DatasetLifecycleUpdate,
    );
    const updatedDataset = await this.datasetsService.findByIdAndUpdate(
      pid,
      jmp.apply(foundDataset, { datasetlifecycle: updateDatasetLifecycleDto }),
    );
    return updatedDataset?.datasetlifecycle as LifecycleClass;
  }

  // PUT /datasets/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetUpdate, DatasetClass),
  )
  @UseInterceptors(
    new UTCTimeInterceptor<DatasetClass>(["creationTime"]),
    new UTCTimeInterceptor<DatasetClass>(["endTime"]),
    new FormatPhysicalQuantitiesInterceptor<DatasetClass>("scientificMetadata"),
  )
  @UsePipes(ScientificMetadataValidationPipe)
  @Put("/:pid")
  @ApiOperation({
    summary: "It updates the dataset.",
    description: `It updates(replaces) the dataset specified through the pid provided. If optional fields are not provided they will be removed.
      The PUT method is responsible for modifying an existing entity. The crucial part about it is that it is supposed to replace an entity.
      Therefore, if we don’t send a field of an entity when performing a PUT request, the missing field should be removed from the document.
      (Caution: This operation could result with data loss if all the dataset fields are not provided)`,
  })
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to modify",
    type: String,
  })
  @ApiBody({
    description:
      "Dataset object that needs to be updated. The whole dataset object with updated fields have to be passed in.",
    required: true,
    type: UpdateDatasetDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetDto,
    description:
      "Update an existing dataset and return its representation in SciCat",
  })
  async findByIdAndReplace(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body()
    updateDatasetDto: UpdateDatasetDto,
  ): Promise<OutputDatasetDto | null> {
    const foundDataset = await this.datasetsService.findOne({
      where: { pid },
    });

    await this.checkPermissionsForDatasetExtended(
      request,
      foundDataset,
      Action.DatasetUpdate,
    );

    const outputDatasetDto = await this.datasetsService.findByIdAndReplace(
      pid,
      updateDatasetDto,
    );

    return outputDatasetDto;
  }

  // DELETE /datasets/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetDelete, DatasetClass),
  )
  @Delete("/:pid")
  @ApiOperation({
    summary: "It deletes the dataset.",
    description: "It delete the dataset specified through the pid specified.",
  })
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to be deleted",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetDto,
    description: "DatasetClass value is returned that is removed",
  })
  async findByIdAndDelete(@Req() request: Request, @Param("pid") pid: string) {
    const foundDataset = await this.datasetsService.findOne({
      where: { pid },
    });

    await this.checkPermissionsForDatasetExtended(
      request,
      foundDataset,
      Action.DatasetDelete,
    );

    const removedDataset = await this.datasetsService.findByIdAndDelete(pid);

    return removedDataset;
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetLogbookRead, DatasetClass),
  )
  @Get("/:pid/logbook")
  @ApiOperation({
    summary: "Retrive logbook associated with dataset.",
    description: "It fetches specific logbook based on dataset pid.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to delete the datablock specified",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Logbook,
    isArray: false,
    description: "It returns all messages from specificied Logbook room",
  })
  async findLogbookByPid(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Query("filters") filters: string,
  ) {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetLogbookRead,
    );

    const proposalId = (dataset?.proposalIds || [])[0];

    if (!proposalId) return null;

    const result = await this.logbooksService.findByName(proposalId, filters);

    return result;
  }
}
