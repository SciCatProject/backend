import {
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpStatus,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { MongoError } from "mongodb";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "src/casl/action.enum";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { IFilters } from "src/common/interfaces/common.interface";
import { CountApiResponse } from "src/common/types";
import { DatasetsService } from "src/datasets/datasets.service";
import { PartialUpdateDatasetObsoleteDto } from "src/datasets/dto/update-dataset-obsolete.dto";
import { DatablocksService } from "./datablocks.service";
import { CreateDatablockDto } from "./dto/create-datablock.dto";
import { PartialUpdateDatablockDto } from "./dto/update-datablock.dto";
import { Datablock, DatablockDocument } from "./schemas/datablock.schema";
import { FilterPipe } from "src/common/pipes/filter.pipe";

@ApiBearerAuth()
@ApiTags("datablocks")
@Controller("datablocks")
export class DatablocksController {
  constructor(
    private readonly datablocksService: DatablocksService,
    private readonly datasetsService: DatasetsService,
    private readonly caslAbilityFactory: CaslAbilityFactory,
  ) {}

  private generateDatablockInstanceForPermissions(
    datablock: Datablock | CreateDatablockDto | null,
  ): Datablock {
    const instance = new Datablock();
    instance.accessGroups = datablock?.accessGroups || [];
    instance.ownerGroup = datablock?.ownerGroup || "";

    return instance;
  }

  private checkPermission(
    request: Request,
    datablock: Datablock | CreateDatablockDto,
    action: Action,
  ) {
    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.datablockInstanceAccess(user);

    if (
      !ability.can(
        action,
        this.generateDatablockInstanceForPermissions(datablock),
      )
    ) {
      throw new ForbiddenException();
    }
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("datablocks", (ability: AppAbility) =>
    ability.can(Action.DatablockCreateEndpoint, Datablock),
  )
  @Post()
  async create(
    @Req() req: Request,
    @Body() createDatablockDto: CreateDatablockDto,
  ): Promise<Datablock> {
    this.checkPermission(
      req,
      createDatablockDto,
      Action.DatablockCreateInstance,
    );

    try {
      const dataset = await this.datasetsService.findOne({
        where: {
          pid: createDatablockDto.datasetId,
        },
      });
      const datablock = await this.datablocksService.create({
        ...createDatablockDto,
        ownerGroup: createDatablockDto.ownerGroup || dataset?.ownerGroup || "",
        accessGroups:
          createDatablockDto.accessGroups || dataset?.accessGroups || [],
      });
      if (dataset) {
        await this.datasetsService.findByIdAndUpdate(datablock.datasetId, {
          packedSize: (dataset.packedSize ?? 0) + datablock.packedSize,
          numberOfFilesArchived:
            dataset.numberOfFilesArchived + datablock.dataFileList.length,
        });
      }
      return datablock;
    } catch (error) {
      if ((error as MongoError).code === 11000) {
        throw new ConflictException(
          "A datablock with this this unique key already exists!",
        );
      } else {
        throw new InternalServerErrorException(error);
      }
    }
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("datablocks", (ability: AppAbility) =>
    ability.can(Action.DatablockReadEndpoint, Datablock),
  )
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving count for datablocks",
    required: false,
    type: String,
    example:
      '{"where": {"datasetId": "20.500.12269/4f8c991e-a879-4e00-9095-5bb13fb02ac4"}}',
  })
  @Get()
  async findAll(
    @Req() request: Request,
    @Query("filter", new FilterPipe()) filter?: IFilters<DatablockDocument>,
  ): Promise<Datablock[]> {
    let datablockFilter: IFilters<DatablockDocument> = filter ?? {};
    const user: JWTUser = request.user as JWTUser;
    const abilities = this.caslAbilityFactory.datablockInstanceAccess(user);

    if (abilities.cannot(Action.DatablockReadAny, Datablock)) {
      datablockFilter = addAccessControlFilters(datablockFilter, user);
    }

    return this.datablocksService.findAll(datablockFilter);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("datablocks", (ability: AppAbility) =>
    ability.can(Action.DatablockReadEndpoint, Datablock),
  )
  @Get("/count")
  @ApiOperation({
    summary: "It returns the number of datablocks.",
    description:
      "It returns a number of datablocks matching the where filter if provided.",
  })
  @ApiQuery({
    name: "where",
    deprecated: true,
    description: "Deprecated, use `filter` instead.",
    required: false,
    type: String,
    example:
      '{"where": {"datasetId": "20.500.12269/4f8c991e-a879-4e00-9095-5bb13fb02ac4"}}',
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving count for datablocks",
    required: false,
    type: String,
    example:
      '{"where": {"datasetId": "20.500.12269/4f8c991e-a879-4e00-9095-5bb13fb02ac4"}}',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description:
      "Return the number of datasets in the following format: { count: integer }",
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    type: ForbiddenException,
    example: {
      message: "Forbidden resource",
      error: "Forbidden",
      statusCode: 403,
    },
    description: "Forbidden resource",
  })
  async count(
    @Req() request: Request,
    @Query("where", new FilterPipe()) where?: IFilters<DatablockDocument>,
    @Query("filter", new FilterPipe()) filter?: IFilters<DatablockDocument>,
  ): Promise<CountApiResponse> {
    if (where && !filter) {
      Logger.warn(
        "Use of deprecated query parameter 'where'",
        `${this.constructor.name}.count`,
      );
      filter = where;
    }

    let datablockFilter: IFilters<DatablockDocument> = filter ?? {};
    const user: JWTUser = request.user as JWTUser;
    const abilities = this.caslAbilityFactory.datablockInstanceAccess(user);

    if (abilities.cannot(Action.DatablockReadAny, Datablock)) {
      datablockFilter = addAccessControlFilters(datablockFilter, user);
    }

    return this.datablocksService.count(datablockFilter);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("datablocks", (ability: AppAbility) =>
    ability.can(Action.DatablockReadEndpoint, Datablock),
  )
  @Get(":id")
  async findById(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<Datablock | null> {
    const user: JWTUser = request.user as JWTUser;
    const abilities = this.caslAbilityFactory.datablockInstanceAccess(user);

    const instance = await this.datablocksService.findOne({ _id: id });
    if (!instance) {
      throw new NotFoundException();
    }

    if (
      abilities.cannot(Action.DatablockReadInstance, instance) &&
      abilities.cannot(Action.DatablockReadAny, Datablock)
    ) {
      throw new UnauthorizedException();
    }

    return instance;
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("datablocks", (ability: AppAbility) =>
    ability.can(Action.DatablockUpdateEndpoint, Datablock),
  )
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Req() request: Request,
    @Body() updateDatablockDto: PartialUpdateDatablockDto,
  ): Promise<Datablock | null> {
    try {
      const instance = await this.datablocksService.findOne({ _id: id });
      const user: JWTUser = request.user as JWTUser;
      const ability = this.caslAbilityFactory.datablockInstanceAccess(user);

      if (!instance) {
        throw new NotFoundException();
      }

      if (
        ability.cannot(Action.DatablockUpdateInstance, instance) &&
        ability.cannot(Action.DatablockUpdateAny, Datablock)
      ) {
        throw new ForbiddenException("Unauthorized to update this datablock");
      }

      const datablock = await this.datablocksService.update(
        { _id: id },
        updateDatablockDto,
      );
      return datablock;
    } catch (error) {
      if ((error as MongoError).code === 11000) {
        throw new ConflictException(
          "A datablock with this this unique key already exists!",
        );
      } else {
        throw new InternalServerErrorException(error);
      }
    }
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("datablocks", (ability: AppAbility) =>
    ability.can(Action.DatablockDeleteEndpoint, Datablock),
  )
  @Delete(":id")
  async remove(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<unknown> {
    const datablock = await this.datablocksService.findOne({
      where: { _id: id },
    });
    if (!datablock) throw new NotFoundException(`datablock: ${id} not found`);
    const dataset = await this.datasetsService.findOne({
      where: { pid: datablock?.datasetId },
    });
    if (!dataset)
      throw new NotFoundException(`dataset: ${datablock.datasetId} not found`);

    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.datablockInstanceAccess(user);
    if (ability.cannot(Action.DatablockDeleteAny, Datablock)) {
      throw new ForbiddenException("Unauthorized to delete this datablock");
    }

    const res = (await this.datablocksService.remove({ _id: id })) as Datablock;
    const updateDatasetDto: PartialUpdateDatasetObsoleteDto = {
      packedSize: (dataset.packedSize ?? 0) - res.packedSize,
      numberOfFilesArchived:
        dataset.numberOfFilesArchived - res.dataFileList.length,
    };
    await this.datasetsService.findByIdAndUpdate(dataset.pid, updateDatasetDto);

    return res;
  }
}

function addAccessControlFilters(
  datablockFilter: IFilters<DatablockDocument>,
  user: JWTUser,
): IFilters<DatablockDocument> {
  if (!datablockFilter.where) {
    datablockFilter.where = {};
  }

  const accessControlFilters = {
    $or: [
      { ownerGroup: { $in: user.currentGroups || [] } },
      { accessGroups: { $in: user.currentGroups || [] } },
      { isPublished: true },
    ],
  };

  if (datablockFilter.where["$and"]) {
    datablockFilter.where["$and"].push(accessControlFilters);
  } else {
    datablockFilter.where["$and"] = [accessControlFilters];
  }

  return datablockFilter;
}
