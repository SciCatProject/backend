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
  HttpCode,
  HttpStatus,
  Req,
  ForbiddenException,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";
import { Request } from "express";
import { OrigDatablocksService } from "./origdatablocks.service";
import { CreateOrigDatablockDto } from "./dto/create-origdatablock.dto";
import { PartialUpdateOrigDatablockDto } from "./dto/update-origdatablock.dto";
import {
  OutputOrigDatablockDto,
  PartialOutputOrigDatablockDto,
} from "./dto/output-origdatablock.dto";
import {
  ApiBearerAuth,
  ApiBody,
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
import {
  OrigDatablock,
  OrigDatablockDocument,
} from "./schemas/origdatablock.schema";
import { IFacets, IFilters } from "src/common/interfaces/common.interface";
import {
  IOrigDatablockFields,
  IOrigDatablockFiltersV4,
} from "./interfaces/origdatablocks.interface";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { DatasetsService } from "src/datasets/datasets.service";
import { PartialUpdateDatasetDto } from "src/datasets/dto/update-dataset.dto";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { CreateDatasetDto } from "src/datasets/dto/create-dataset.dto";
import { OutputDatasetDto } from "src/datasets/dto/output-dataset.dto";
import {
  IsValidResponse,
  FullFacetFilters,
  FullFacetResponse,
} from "src/common/types";
import { getSwaggerOrigDatablockFilterContent } from "./types/origdatablock-filter-content";
import {
  OrigDatablockLookupKeysEnum,
  ORIGDATABLOCK_LOOKUP_FIELDS,
  ALLOWED_ORIGDATABLOCK_KEYS,
  ALLOWED_ORIGDATABLOCK_FILTER_KEYS,
} from "./types/origdatablock-lookup";
import { IncludeValidationPipe } from "src/common/pipes/include-validation.pipe";
import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import { checkUnmodifiedSince } from "src/common/utils/check-unmodified-since";

@ApiBearerAuth()
@ApiTags("origdatablocks v4")
/* NOTE: Generated SDK method names include "V4" twice:
 *  - From the controller class name (OrigDatablocksV4Controller)
 *  - From the route version (`version: '4'`)
 * This is intentional for versioned routing.
 */
@Controller({ path: "origdatablocks", version: "4" })
export class OrigDatablocksV4Controller {
  constructor(
    private readonly origDatablocksService: OrigDatablocksService,
    private readonly datasetsService: DatasetsService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async generateOrigDatablockInstanceForPermissions(
    origdatablock:
      | CreateOrigDatablockDto
      | OutputOrigDatablockDto
      | OrigDatablock,
  ): Promise<OrigDatablock> {
    const origDatablockInstance = new OrigDatablock();
    origDatablockInstance.datasetId = origdatablock.datasetId || "";
    origDatablockInstance.accessGroups = origdatablock.accessGroups || [];
    origDatablockInstance.ownerGroup = origdatablock.ownerGroup;
    origDatablockInstance.isPublished = origdatablock.isPublished || false;
    return origDatablockInstance;
  }

  async generateDatasetInstanceForPermissions(
    dataset: CreateDatasetDto | OutputDatasetDto | DatasetClass,
  ): Promise<DatasetClass> {
    const datasetInstance = new DatasetClass();
    datasetInstance._id = "";
    datasetInstance.pid = dataset.pid || "";
    datasetInstance.accessGroups = dataset.accessGroups || [];
    datasetInstance.ownerGroup = dataset.ownerGroup;
    datasetInstance.sharedWith = dataset.sharedWith;
    datasetInstance.isPublished = dataset.isPublished || false;
    return datasetInstance;
  }

  async checkOrigDatablockPermissionsForUser(
    user: JWTUser,
    origdatablock: CreateOrigDatablockDto | OutputOrigDatablockDto | null,
    group: Action,
  ): Promise<boolean> {
    if (!origdatablock) {
      return false;
    }
    const origDatablockInstance =
      await this.generateOrigDatablockInstanceForPermissions(origdatablock);

    const ability = this.caslAbilityFactory.origDatablockInstanceAccess(user);

    let canDoAction = false;

    switch (group) {
      case Action.OrigdatablockCreate:
        canDoAction =
          ability.can(Action.OrigdatablockCreateAny, origDatablockInstance) ||
          ability.can(Action.OrigdatablockCreateOwner, origDatablockInstance);
        break;
      case Action.OrigdatablockRead:
        canDoAction =
          ability.can(Action.OrigdatablockReadAny, origDatablockInstance) ||
          ability.can(
            Action.OrigdatablockReadOnePublic,
            origDatablockInstance,
          ) ||
          ability.can(
            Action.OrigdatablockReadOneAccess,
            origDatablockInstance,
          ) ||
          ability.can(Action.OrigdatablockReadOneOwner, origDatablockInstance);
        break;
      case Action.OrigdatablockUpdate:
        canDoAction =
          ability.can(Action.OrigdatablockUpdateAny, origDatablockInstance) ||
          ability.can(Action.OrigdatablockUpdateOwner, origDatablockInstance);
        break;
      case Action.OrigdatablockDelete:
        canDoAction =
          ability.can(Action.OrigdatablockDeleteAny, origDatablockInstance) ||
          ability.can(Action.OrigdatablockDeleteOwner, origDatablockInstance);
        break;
      default:
        throw new InternalServerErrorException(
          "Permission for the action is not specified",
        );
    }

    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized access");
    }

    return canDoAction;
  }

  async checkDatasetPermissionsForUser(
    user: JWTUser,
    dataset: OutputDatasetDto | null,
    group: Action,
  ): Promise<boolean> {
    if (!dataset) {
      return false;
    }
    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(dataset);

    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);

    let canDoAction = false;

    switch (group) {
      case Action.DatasetRead:
        canDoAction =
          ability.can(Action.DatasetReadAny, datasetInstance) ||
          ability.can(Action.DatasetReadOneOwner, datasetInstance) ||
          ability.can(Action.DatasetReadOneAccess, datasetInstance) ||
          ability.can(Action.DatasetReadOnePublic, datasetInstance);
        break;
      case Action.DatasetUpdate:
        canDoAction =
          ability.can(Action.DatasetUpdateAny, datasetInstance) ||
          ability.can(Action.DatasetUpdateOwner, datasetInstance);
        break;
      default:
        throw new InternalServerErrorException(
          "Permission for the action is not specified",
        );
    }

    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized access");
    }

    return canDoAction;
  }

  async checkPermissionsForOrigDatablockWrite(
    request: Request,
    origDatablockInput: CreateOrigDatablockDto | string | null,
    group: Action,
  ) {
    const user: JWTUser = request.user as JWTUser;

    if (!origDatablockInput) {
      throw new NotFoundException(
        `OrigDatablock: ${origDatablockInput} not found`,
      );
    }

    let origdatablock = null;

    if (typeof origDatablockInput === "string") {
      origdatablock = await this.origDatablocksService.findOneComplete({
        where: { _id: origDatablockInput },
      });

      if (!origdatablock) {
        throw new NotFoundException(
          `OrigDatablock: ${origDatablockInput} not found`,
        );
      }
    } else {
      origdatablock = origDatablockInput;
    }

    await this.checkOrigDatablockPermissionsForUser(user, origdatablock, group);

    // Bypass dataset permission checks for delete, will deadlock otherwise if dataset is deleted first
    if (group != Action.OrigdatablockDelete) {
      const dataset = await this.datasetsService.findOneComplete({
        where: { pid: origdatablock.datasetId },
      });

      if (!dataset) {
        throw new NotFoundException(
          `Dataset: ${origdatablock.datasetId} not found for attaching an origdatablock`,
        );
      }

      await this.checkDatasetPermissionsForUser(
        user,
        dataset,
        Action.DatasetUpdate,
      );
    }

    return origdatablock;
  }

  async checkPermissionsForOrigDatablockRead(
    request: Request,
    origDatablockInput: string | null,
    group: Action,
  ) {
    const user: JWTUser = request.user as JWTUser;

    if (!origDatablockInput) {
      throw new NotFoundException(
        `OrigDatablock: ${origDatablockInput} not found`,
      );
    }

    const origdatablock = await this.origDatablocksService.findOneComplete({
      where: { _id: origDatablockInput },
    });

    if (!origdatablock) {
      throw new NotFoundException(
        `OrigDatablock: ${origDatablockInput} not found`,
      );
    }

    await this.checkOrigDatablockPermissionsForUser(user, origdatablock, group);

    const dataset = await this.datasetsService.findOneComplete({
      where: { pid: origdatablock.datasetId },
    });

    if (!dataset) {
      throw new NotFoundException(
        `Dataset: ${origdatablock.datasetId} not found for attaching an origdatablock`,
      );
    }

    await this.checkDatasetPermissionsForUser(
      user,
      dataset,
      Action.DatasetRead,
    );

    return origdatablock;
  }

  addAccessBasedFilters(
    user: JWTUser,
    filter: IOrigDatablockFiltersV4<
      OrigDatablockDocument,
      IOrigDatablockFields
    >,
  ): IOrigDatablockFiltersV4<OrigDatablockDocument, IOrigDatablockFields> {
    const ability = this.caslAbilityFactory.origDatablockInstanceAccess(user);
    const canViewAny = ability.can(Action.OrigdatablockReadAny, OrigDatablock);
    const canViewOwner = ability.can(
      Action.OrigdatablockReadManyOwner,
      OrigDatablock,
    );
    const canViewAccess = ability.can(
      Action.OrigdatablockReadManyAccess,
      OrigDatablock,
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

  async updateDatasetSizeAndFiles(pid: string) {
    const parsedFilters: IFilters<OrigDatablockDocument, IOrigDatablockFields> =
      { where: { datasetId: pid } };
    const datasetOrigdatablocks =
      (await this.origDatablocksService.findAllComplete(
        parsedFilters,
      )) as OutputOrigDatablockDto[];

    const updateDatasetDto: PartialUpdateDatasetDto = {
      size: datasetOrigdatablocks
        .map((odb) => odb.size)
        .reduce((ps, a) => ps + a, 0),
      numberOfFiles: datasetOrigdatablocks
        .map((odb) => odb.dataFileList.length)
        .reduce((ps, a) => ps + a, 0),
    };

    await this.datasetsService.findByIdAndUpdate(pid, updateDatasetDto);
  }

  // POST /origdatablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockCreate, OrigDatablock),
  )
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({
    summary: "It creates a new origdatablock for the specified dataset",
    description:
      "It creates a new original datablock for the specified dataset. It contains the list of files associated with the datasets. Each dataset can have more than one orig datablocks.",
  })
  @ApiBody({
    description: "Input fields for the origdatablock to be created",
    required: true,
    type: CreateOrigDatablockDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: OutputOrigDatablockDto,
    description:
      "Create a new origdatablock and return its representation in SciCat",
  })
  async create(
    @Req() request: Request,
    @Body() createOrigDatablockDto: CreateOrigDatablockDto,
  ): Promise<OrigDatablock> {
    const dataset = await this.datasetsService.findOneComplete({
      where: { pid: createOrigDatablockDto.datasetId },
    });

    if (dataset) {
      createOrigDatablockDto = {
        ...createOrigDatablockDto,
        ownerGroup: dataset.ownerGroup,
        accessGroups: dataset.accessGroups,
        instrumentGroup: dataset.instrumentGroup,
      };
    }

    await this.checkPermissionsForOrigDatablockWrite(
      request,
      createOrigDatablockDto,
      Action.OrigdatablockCreate,
    );

    const origdatablock = await this.origDatablocksService.create(
      createOrigDatablockDto,
    );

    if (origdatablock) {
      await this.updateDatasetSizeAndFiles(origdatablock.datasetId);
    }

    return origdatablock;
  }

  // POST /origdatablocks/isValid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockCreate, OrigDatablock),
  )
  @HttpCode(HttpStatus.OK)
  @Post("/isValid")
  @ApiOperation({
    summary: "It validates the origdatablock provided as input",
    description:
      "It validates the original datablock provided as input, and returns true if the information is a valid dataset.",
  })
  @ApiBody({
    description:
      "Input fields for the origdatablock that needs to be validated",
    required: true,
    type: OrigDatablock,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IsValidResponse,
    description:
      "Check if the origdatablock provided passes validation. It returns true if the validation is passed.",
  })
  async isValid(
    @Req() request: Request,
    @Body() createOrigDatablockDto: object,
  ): Promise<IsValidResponse> {
    await this.checkPermissionsForOrigDatablockWrite(
      request,
      createOrigDatablockDto as CreateOrigDatablockDto,
      Action.OrigdatablockCreate,
    );

    const dtoTestOrigDatablock = plainToInstance(
      CreateOrigDatablockDto,
      createOrigDatablockDto,
    );

    const errors = await validate(dtoTestOrigDatablock);

    const valid = errors.length === 0;

    return { valid: valid, reason: errors };
  }

  // GET /origdatablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockRead, OrigDatablock),
  )
  @Get()
  @ApiOperation({
    summary: "It returns a list of origdatablocks",
    description:
      "It returns a list of original datablocks. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving origdatablocks",
    required: false,
    type: String,
    example: getSwaggerOrigDatablockFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartialOutputOrigDatablockDto,
    isArray: true,
    description: "Return the origdatablocks requested",
  })
  async findAll(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_ORIGDATABLOCK_KEYS,
        ALLOWED_ORIGDATABLOCK_FILTER_KEYS,
      ),
      new IncludeValidationPipe(ORIGDATABLOCK_LOOKUP_FIELDS),
    )
    queryFilter: string,
  ): Promise<PartialOutputOrigDatablockDto[]> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    const mergedFilter = this.addAccessBasedFilters(
      request.user as JWTUser,
      parsedFilter,
    );

    const origdatablocks =
      await this.origDatablocksService.findAllComplete(mergedFilter);

    return origdatablocks;
  }

  // GET /origdatablocks/files
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockRead, OrigDatablock),
  )
  @Get("/files")
  @ApiOperation({
    summary: "It returns a list of origdatablocks, one for each datafile",
    description:
      "It returns a list of original datablocks, one for each datafile. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving origdatablocks",
    required: false,
    type: String,
    example: getSwaggerOrigDatablockFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartialOutputOrigDatablockDto,
    isArray: true,
    description: "Return the origdatablocks requested",
  })
  async findAllFiles(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(
        ALLOWED_ORIGDATABLOCK_KEYS,
        ALLOWED_ORIGDATABLOCK_FILTER_KEYS,
      ),
      new IncludeValidationPipe(ORIGDATABLOCK_LOOKUP_FIELDS),
    )
    queryFilter: string,
  ): Promise<PartialOutputOrigDatablockDto[]> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    const mergedFilter = this.addAccessBasedFilters(
      request.user as JWTUser,
      parsedFilter,
    );

    const origdatablocks =
      await this.origDatablocksService.findAllFilesComplete(mergedFilter);

    return origdatablocks;
  }

  // GET /origdatablocks/fullfacet
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockRead, OrigDatablock),
  )
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
    description: "Return fullfacet response for origdatablocks requested",
  })
  async fullfacet(
    @Req() request: Request,
    @Query() filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    const user: JWTUser = request.user as JWTUser;
    const fields: IOrigDatablockFields = JSON.parse(filters.fields ?? "{}");

    const ability = this.caslAbilityFactory.origDatablockInstanceAccess(user);
    const canViewAny = ability.can(Action.OrigdatablockReadAny, OrigDatablock);
    if (!canViewAny) {
      const canViewAccess = ability.can(
        Action.OrigdatablockReadManyAccess,
        OrigDatablock,
      );
      const canViewOwner = ability.can(
        Action.OrigdatablockReadManyOwner,
        OrigDatablock,
      );

      if (canViewAccess) {
        fields.userGroups = fields.userGroups ?? [];
        fields.userGroups.push(...user.currentGroups);
      } else if (canViewOwner) {
        fields.ownerGroup = fields.ownerGroup ?? [];
        fields.ownerGroup.push(...user.currentGroups);
      }
    }
    const parsedFilters: IFacets<IOrigDatablockFields> = {
      fields: fields,
      facets: JSON.parse(filters.facets ?? "{}"),
    };

    return this.origDatablocksService.fullfacet(parsedFilters);
  }

  // GET /origdatablocks/fullfacet/files
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockRead, OrigDatablock),
  )
  @Get("/fullfacet/files")
  @ApiQuery({
    name: "filters",
    description:
      "Defines list of field names, for which facet counts should be calculated",
    required: false,
    type: FullFacetFilters,
    example:
      '{"facets": ["type","creationLocation","ownerGroup","keywords"], fields: {}}',
  })
  async fullfacetFiles(
    @Req() request: Request,
    @Query() filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    const user: JWTUser = request.user as JWTUser;
    const fields: IOrigDatablockFields = JSON.parse(filters.fields ?? "{}");

    const ability = this.caslAbilityFactory.origDatablockInstanceAccess(user);
    const canViewAny = ability.can(Action.OrigdatablockReadAny, OrigDatablock);
    if (!canViewAny) {
      const canViewAccess = ability.can(
        Action.OrigdatablockReadManyAccess,
        OrigDatablock,
      );
      const canViewOwner = ability.can(
        Action.OrigdatablockReadManyOwner,
        OrigDatablock,
      );

      if (canViewAccess) {
        fields.userGroups = fields.userGroups ?? [];
        fields.userGroups.push(...user.currentGroups);
      } else if (canViewOwner) {
        fields.ownerGroup = fields.ownerGroup ?? [];
        fields.ownerGroup.push(...user.currentGroups);
      }
    }
    const parsedFilters = {
      fields: fields,
      limits: JSON.parse(filters.facets ?? "{}"),
    };
    const getSubFieldCount = "dataFileList";

    return this.origDatablocksService.fullfacet(
      parsedFilters,
      getSubFieldCount,
    );
  }

  // GET /origdatablocks/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockRead, OrigDatablock),
  )
  @Get("/:id")
  @ApiOperation({
    summary: "It retrieves the origdatablock",
    description: "It retrieves the original datablock with the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the origdatablock to be retrieved",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The origdatablock requested",
    type: OutputOrigDatablockDto,
  })
  @ApiQuery({
    name: "include",
    enum: OrigDatablockLookupKeysEnum,
    type: String,
    required: false,
    isArray: true,
  })
  async findById(
    @Req() request: Request,
    @Param("id") id: string,
    @Query("include", new IncludeValidationPipe(ORIGDATABLOCK_LOOKUP_FIELDS))
    include: OrigDatablockLookupKeysEnum[] | OrigDatablockLookupKeysEnum,
  ): Promise<OutputOrigDatablockDto | null> {
    await this.checkPermissionsForOrigDatablockRead(
      request,
      id,
      Action.OrigdatablockRead,
    );

    const includeArray = Array.isArray(include)
      ? include
      : include && Array(include);

    const origdatablock = await this.origDatablocksService.findOneComplete({
      where: { _id: id },
      include: includeArray,
    });

    return origdatablock;
  }

  // PATCH /origdatablocks/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockUpdate, OrigDatablock),
  )
  @Patch("/:id")
  @ApiOperation({
    summary: "It updates the origdatablock",
    description: "It updates the original datablock with the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the origdatablock to be updated",
    type: String,
  })
  @ApiBody({
    description:
      "Origdatablock object that needs to be updated. Only the origdatablock object fields that need to be updated should be passed in.",
    required: true,
    type: PartialUpdateOrigDatablockDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "The updated origdatablock",
    type: OutputOrigDatablockDto,
  })
  async findByIdAndUpdate(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updateOrigDatablockDto: PartialUpdateOrigDatablockDto,
  ): Promise<OrigDatablock | null> {
    const datablock = (await this.checkPermissionsForOrigDatablockWrite(
      request,
      id,
      Action.OrigdatablockUpdate,
    )) as OrigDatablock;

    //checks if the resource is unmodified since clients timestamp
    checkUnmodifiedSince(
      datablock.updatedAt,
      request.headers["if-unmodified-since"],
    );

    const origdatablock = await this.origDatablocksService.findByIdAndUpdate(
      id,
      updateOrigDatablockDto,
    );

    if (origdatablock) {
      await this.updateDatasetSizeAndFiles(origdatablock.datasetId);
    }

    return origdatablock;
  }

  // DELETE /origdatablocks/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockDelete, OrigDatablock),
  )
  @Delete("/:id")
  @ApiOperation({
    summary: "It deletes the origdatablock",
    description: "It deletes the original datablock specified by the id.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the origdatablock to be deleted",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputOrigDatablockDto,
    description: "Removed origdatablock value is returned",
  })
  async findByIdAndDelete(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<OutputOrigDatablockDto | null> {
    await this.checkPermissionsForOrigDatablockWrite(
      request,
      id,
      Action.OrigdatablockDelete,
    );

    const origdatablock =
      await this.origDatablocksService.findByIdAndDelete(id);

    if (origdatablock) {
      await this.updateDatasetSizeAndFiles(origdatablock.datasetId);
    }

    return origdatablock;
  }
}
