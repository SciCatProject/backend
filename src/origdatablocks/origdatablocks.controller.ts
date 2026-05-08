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
} from "@nestjs/common";
import { Request } from "express";
import { OrigDatablocksService } from "./origdatablocks.service";
import { CreateOrigDatablockDto } from "./dto/create-origdatablock.dto";
import { PartialUpdateOrigDatablockDto } from "./dto/update-origdatablock.dto";
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
import { IFilters } from "src/common/interfaces/common.interface";
import { IOrigDatablockFields } from "./interfaces/origdatablocks.interface";
import { plainToInstance } from "class-transformer";
import { validate, ValidationError } from "class-validator";
import { DatasetsService } from "src/datasets/datasets.service";
import { filterDescription, filterExample, parseDate } from "src/common/utils";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { CreateRawDatasetObsoleteDto } from "src/datasets/dto/create-raw-dataset-obsolete.dto";
import { CreateDerivedDatasetObsoleteDto } from "src/datasets/dto/create-derived-dataset-obsolete.dto";
import { logger } from "@user-office-software/duo-logger";
import { FullFacetFilters, FullFacetResponse } from "src/common/types";

@ApiBearerAuth()
@ApiTags("origdatablocks")
@Controller({ path: "origdatablocks", version: "3" })
export class OrigDatablocksController {
  constructor(
    private readonly origDatablocksService: OrigDatablocksService,
    private readonly datasetsService: DatasetsService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async checkPermissionsForOrigDatablock(
    request: Request,
    id: string,
    group: Action,
  ) {
    const origDatablock = await this.origDatablocksService.findOne({ _id: id });
    if (!origDatablock) {
      throw new NotFoundException(`OrigDatablock: ${id} not found`);
    }

    await this.checkPermissionsForOrigDatablockExtended(
      request,
      origDatablock.datasetId,
      group,
    );

    return origDatablock;
  }

  // async checkPermissionsForDataset(request: Request, id: string) {
  //   const user: JWTUser = request.user as JWTUser;
  //   const dataset = await this.datasetsService.findOne({
  //     where: { pid: id },
  //   });
  //   if (dataset) {
  //     // NOTE: We need DatasetClass instance because casl module
  //     // can not recognize the type from dataset mongo database model.
  //     // If other fields are needed can be added later.
  //     const newDatasetClass = new DatasetClass();
  //     newDatasetClass.ownerGroup = dataset.ownerGroup;

  //     if (user) {
  //       const ability = this.caslAbilityFactory.createOrigDatablockForUser(user);
  //       const canUpdate = ability.can(Action.Update, newDatasetClass);
  //       if (!canUpdate) {
  //         throw new ForbiddenException("Unauthorized access");
  //       }
  //     }
  //   } else {
  //     throw new BadRequestException("Invalid datasetId");
  //   }
  //   return dataset;
  // }

  async generateOrigDatablockInstanceInstanceForPermissions(
    dataset:
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | DatasetClass,
  ): Promise<OrigDatablock> {
    const origDatablockInstance = new OrigDatablock();
    origDatablockInstance.datasetId = dataset.pid || "";
    origDatablockInstance.accessGroups = dataset.accessGroups || [];
    origDatablockInstance.ownerGroup = dataset.ownerGroup;
    origDatablockInstance.isPublished = dataset.isPublished || false;
    return origDatablockInstance;
  }

  async checkPermissionsForOrigDatablockExtended(
    request: Request,
    id: string,
    group: Action,
  ) {
    const dataset = await this.datasetsService.findOne({ where: { pid: id } });
    const user: JWTUser = request.user as JWTUser;

    if (!dataset) {
      throw new NotFoundException(
        `Dataset: ${id} not found for attaching an origdatablock`,
      );
    }

    const origDatablockInstance =
      await this.generateOrigDatablockInstanceInstanceForPermissions(dataset);

    const ability = this.caslAbilityFactory.origDatablockInstanceAccess(user);

    let canDoAction = false;

    if (group == Action.OrigdatablockCreate) {
      canDoAction =
        ability.can(Action.OrigdatablockCreateAny, origDatablockInstance) ||
        ability.can(Action.OrigdatablockCreateOwner, origDatablockInstance);
    } else if (group == Action.OrigdatablockRead) {
      canDoAction =
        ability.can(Action.OrigdatablockReadAny, origDatablockInstance) ||
        ability.can(Action.OrigdatablockReadOnePublic, origDatablockInstance) ||
        ability.can(Action.OrigdatablockReadOneAccess, origDatablockInstance) ||
        ability.can(Action.OrigdatablockReadOneOwner, origDatablockInstance);
    } else if (group == Action.OrigdatablockUpdate) {
      canDoAction =
        ability.can(Action.OrigdatablockUpdateAny, origDatablockInstance) ||
        ability.can(Action.OrigdatablockUpdateOwner, origDatablockInstance);
    }

    if (!canDoAction) {
      throw new ForbiddenException("Unauthorized access");
    }

    return dataset;
  }

  // POST /origdatablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockCreate, OrigDatablock),
  )
  @HttpCode(HttpStatus.CREATED)
  @Post()
  @ApiOperation({
    summary: "It creates a new orig datablock for the specified dataset.",
    description:
      "It creates a new orig datablock for the specified dataset. It contains the list of files associated with the datasets. Each dataset can have more than one orig datablocks",
  })
  @ApiBody({
    description: "Input fields for the orig datablock to be created",
    required: true,
    type: CreateOrigDatablockDto,
  })
  @ApiResponse({
    status: 201,
    type: OrigDatablock,
    description:
      "Create a new origdataset and return its representation in SciCat",
  })
  async create(
    @Req() request: Request,
    @Body() createOrigDatablockDto: CreateOrigDatablockDto,
  ): Promise<OrigDatablock> {
    const dataset = await this.checkPermissionsForOrigDatablockExtended(
      request,
      createOrigDatablockDto.datasetId,
      Action.OrigdatablockCreate,
    );

    if (dataset) {
      createOrigDatablockDto = {
        ...createOrigDatablockDto,
        ownerGroup: dataset.ownerGroup,
        accessGroups: dataset.accessGroups,
        instrumentGroup: dataset.instrumentGroup,
      };
    }

    const origdatablock = await this.origDatablocksService.create(
      createOrigDatablockDto,
    );

    await this.updateDatasetSizeAndFiles(dataset.pid);

    return origdatablock;
  }

  async updateDatasetSizeAndFiles(pid: string) {
    const { size, numberOfFiles } =
      await this.origDatablocksService.aggregateSizeAndFileCount(pid);

    await this.datasetsService.findByIdAndUpdate(pid, { size, numberOfFiles });
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockCreate, OrigDatablock),
  )
  @HttpCode(HttpStatus.OK)
  @Post("/isValid")
  @ApiOperation({
    summary: "It validates the orig datablock provided as input.",
    description:
      "It validates the orig datablock provided as input, and returns true if the information is a valid dataset",
  })
  @ApiBody({
    description:
      "Input fields for the orig datablock that needs to be validated",
    required: true,
    type: OrigDatablock,
  })
  @ApiResponse({
    status: 200,
    type: Boolean,
    description:
      "Check if the orig datablock provided pass validation. It return true if the validation is passed",
  })
  async isValid(
    @Req() request: Request,
    @Body() createOrigDatablock: unknown,
  ): Promise<{ valid: boolean; errors: ValidationError[] }> {
    await this.checkPermissionsForOrigDatablockExtended(
      request,
      (createOrigDatablock as CreateOrigDatablockDto).datasetId,
      Action.OrigdatablockCreate,
    );
    const dtoTestOrigDatablock = plainToInstance(
      CreateOrigDatablockDto,
      createOrigDatablock,
    );

    const errorsTestOrigDatablock = await validate(dtoTestOrigDatablock);

    const valid = errorsTestOrigDatablock.length == 0;

    return { valid: valid, errors: errorsTestOrigDatablock };
  }

  // GET /origdatablock
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockRead, OrigDatablock),
  )
  @Get()
  @ApiOperation({
    summary: "It returns a list of orig datablocks.",
    description:
      "It returns a list of orig datablocks. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving all origdatablocks\n" +
      filterDescription,
    required: false,
    type: String,
    example: filterExample,
  })
  @ApiResponse({
    status: 200,
    type: OrigDatablock,
    isArray: true,
    description: "Return the orig datablocks requested",
  })
  async findAll(
    @Req() request: Request,
    @Query("filter") filter?: string,
  ): Promise<OrigDatablock[]> {
    const user: JWTUser = request.user as JWTUser;
    const parsedFilters: IFilters<OrigDatablockDocument, IOrigDatablockFields> =
      JSON.parse(filter ?? "{}");
    const ability = this.caslAbilityFactory.origDatablockInstanceAccess(user);
    const canViewAny = ability.can(Action.OrigdatablockReadAny, OrigDatablock);
    if (!canViewAny) {
      parsedFilters.where = parsedFilters.where ?? {};
      const canViewAccess = ability.can(
        Action.OrigdatablockReadManyAccess,
        OrigDatablock,
      );
      const canViewOwner = ability.can(
        Action.OrigdatablockReadManyOwner,
        OrigDatablock,
      );

      if (!user) {
        parsedFilters.where.isPublished = true;
      } else if (canViewAccess) {
        parsedFilters.where.userGroups = parsedFilters.where.userGroups ?? [];
        parsedFilters.where.userGroups.push(...user.currentGroups);
      } else if (canViewOwner) {
        if (!parsedFilters.where.ownerGroup) {
          parsedFilters.where.ownerGroup = [];
        }

        parsedFilters.where.ownerGroup = Array.isArray(
          parsedFilters.where.ownerGroup,
        )
          ? parsedFilters.where.ownerGroup
          : [parsedFilters.where.ownerGroup as string];
        parsedFilters.where.ownerGroup.push(...user.currentGroups);
      }
    }

    return this.origDatablocksService.findAll(parsedFilters);
  }

  // GET /origdatablocks/fullquery
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockRead, OrigDatablock),
  )
  @Get("/fullquery")
  @ApiQuery({
    name: "fields",
    description:
      "Define the query conditions using mongoDB syntax as JSON object. It also supports the `text` search, if you want to look for strings anywhere in the originalDatablocks. Please refer to mongo documentation for more information about the syntax",
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
  async fullquery(
    @Req() request: Request,
    @Query() filters: { fields?: string; limits?: string },
  ): Promise<OrigDatablock[] | null> {
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

      if (!user) {
        fields.isPublished = true;
      } else if (canViewAccess) {
        fields.userGroups = fields.userGroups ?? [];
        fields.userGroups.push(...user.currentGroups);
      } else if (canViewOwner) {
        fields.ownerGroup = fields.ownerGroup ?? [];
        fields.ownerGroup.push(...user.currentGroups);
      }
    }

    const parsedFilters = {
      fields: fields,
      limits: JSON.parse(filters.limits ?? "{}"),
    };

    const result = await this.origDatablocksService.fullquery(parsedFilters);

    logger.logInfo("Original datablocks data is downloaded", {
      user: user,
    });

    return result;
  }

  // GET /origdatablocks/fullquery/files
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockRead, OrigDatablock),
  )
  @Get("/fullquery/files")
  @ApiQuery({
    name: "fields",
    description:
      "Define the query conditions using mongoDB syntax as JSON object. It also supports the `text` search, if you want to look for strings anywhere in the originalDatablocks. Please refer to mongo documentation for more information about the syntax",
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
  async fullqueryFiles(
    @Req() request: Request,
    @Query() filters: { fields?: string; limits?: string },
  ): Promise<OrigDatablock[] | null> {
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

      if (!user) {
        fields.isPublished = true;
      } else if (canViewAccess) {
        fields.userGroups = fields.userGroups ?? [];
        fields.userGroups.push(...user.currentGroups);
      } else if (canViewOwner) {
        fields.ownerGroup = fields.ownerGroup ?? [];
        fields.ownerGroup.push(...user.currentGroups);
      }
    }
    const parsedFilters = {
      fields: fields,
      limits: JSON.parse(filters.limits ?? "{}"),
    };

    return this.origDatablocksService.fullqueryFilesList(parsedFilters);
  }

  //  GET /origdatablocks/fullfacet
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

      if (!user) {
        fields.isPublished = true;
      } else if (canViewAccess) {
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

    return this.origDatablocksService.fullfacet(parsedFilters);
  }

  //  GET /origdatablocks/fullfacet/files
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

      if (!user) {
        fields.isPublished = true;
      } else if (canViewAccess) {
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
    summary: "It retrieve the origdatablock.",
    description: "It retrieve the original datablock with the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the origdatablock to be retrieved",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "The origdatablock requested",
    type: OrigDatablock,
  })
  async findById(
    @Req() request: Request,
    @Param("id")
    id: string,
  ): Promise<OrigDatablock | null> {
    const origdatablock = await this.checkPermissionsForOrigDatablock(
      request,
      id,
      Action.OrigdatablockRead,
    );

    return origdatablock;
  }

  // PATCH /origdatablocks/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockUpdate, OrigDatablock),
  )
  @Patch("/:id")
  @ApiOperation({
    summary: "It updates the origdatablock.",
    description: "It updates the original datablock with the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the origdatablock to be updated",
    type: String,
  })
  @ApiBody({
    description:
      "OrigDatablock object that needs to be updated. Only the origdatablock object fields that needs to be updated, should be passed in.",
    required: true,
    type: PartialUpdateOrigDatablockDto,
  })
  @ApiResponse({
    status: 200,
    description: "The updated origdatablock",
    type: OrigDatablock,
  })
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updateOrigDatablockDto: PartialUpdateOrigDatablockDto,
  ): Promise<OrigDatablock | null> {
    await this.checkPermissionsForOrigDatablock(
      request,
      id,
      Action.OrigdatablockUpdate,
    );
    const unmodifiedSince = parseDate(request.headers["if-unmodified-since"]);
    const origdatablock = await this.origDatablocksService.findByIdAndUpdate(
      id,
      updateOrigDatablockDto,
      unmodifiedSince,
    );
    if (!origdatablock) {
      throw new NotFoundException("Datablock not found");
    }
    await this.updateDatasetSizeAndFiles(origdatablock.datasetId);
    return origdatablock;
  }

  // DELETE /origdatablocks/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("origdatablocks", (ability: AppAbility) =>
    ability.can(Action.OrigdatablockDelete, OrigDatablock),
  )
  @Delete("/:id")
  @ApiOperation({
    summary: "It deletes the origdatablock.",
    description:
      "It delete the original datablock specified through the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the origdatablock to be deleted",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "No value is returned",
  })
  async remove(@Param("id") id: string): Promise<unknown> {
    const origdatablock = (await this.origDatablocksService.remove({
      _id: id,
    })) as OrigDatablock;

    await this.updateDatasetSizeAndFiles(origdatablock.datasetId);

    return origdatablock;
  }
}
