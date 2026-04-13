import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Delete,
  ForbiddenException,
  Get,
  HttpCode,
  HttpException,
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
import { ConfigService } from "@nestjs/config";
import {
  ApiBearerAuth,
  ApiBody,
  ApiExtraModels,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
  getSchemaPath,
} from "@nestjs/swagger";
import { ClassConstructor, plainToInstance } from "class-transformer";
import { validate, ValidationError, ValidatorOptions } from "class-validator";
import { Request } from "express";
import { MongoError } from "mongodb";
import { UpdateQuery } from "mongoose";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CreateAttachmentV3Dto } from "src/attachments/dto-obsolete/create-attachment.v3.dto";
import { OutputAttachmentV3Dto } from "src/attachments/dto-obsolete/output-attachment.v3.dto";
import { UpdateAttachmentV3Dto } from "src/attachments/dto-obsolete/update-attachment.v3.dto";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "src/casl/action.enum";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { FormatPhysicalQuantitiesInterceptor } from "src/common/interceptors/format-physical-quantities.interceptor";
import { MultiUTCTimeInterceptor } from "src/common/interceptors/multi-utc-time.interceptor";
import { UTCTimeInterceptor } from "src/common/interceptors/utc-time.interceptor";
import { IFacets, IFilters } from "src/common/interfaces/common.interface";
import { FilterPipe } from "src/common/pipes/filter.pipe";
import { DataFile } from "src/common/schemas/datafile.schema";
import { ScientificMetadataValidationPipe } from "./pipes/scientific-metadata-validation.pipe";
import {
  CountApiResponse,
  FullFacetResponse,
  IsValidResponse,
} from "src/common/types";
import {
  datasetsFullQueryDescriptionFields,
  datasetsFullQueryExampleFields,
  filterDescription,
  fullQueryDescriptionLimits,
  fullQueryExampleLimits,
} from "src/common/utils";
import { AccessGroupsType } from "src/config/configuration";
import { DatablocksService } from "src/datablocks/datablocks.service";
import { CreateDatablockDto } from "src/datablocks/dto/create-datablock.dto";
import { CreateDatasetDatablockDto } from "src/datablocks/dto/create-dataset-datablock";
import { PartialUpdateDatablockDto } from "src/datablocks/dto/update-datablock.dto";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { LogbooksService } from "src/logbooks/logbooks.service";
import { Logbook } from "src/logbooks/schemas/logbook.schema";
import { CreateDatasetOrigDatablockDto } from "src/origdatablocks/dto/create-dataset-origdatablock";
import { CreateOrigDatablockDto } from "src/origdatablocks/dto/create-origdatablock.dto";
import { UpdateOrigDatablockDto } from "src/origdatablocks/dto/update-origdatablock.dto";
import { OrigDatablocksService } from "src/origdatablocks/origdatablocks.service";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { DatasetsService } from "./datasets.service";
import { CreateDatasetDto } from "./dto/create-dataset.dto";
import { CreateDerivedDatasetObsoleteDto } from "./dto/create-derived-dataset-obsolete.dto";
import { CreateRawDatasetObsoleteDto } from "./dto/create-raw-dataset-obsolete.dto";
import { OutputDatasetObsoleteDto } from "./dto/output-dataset-obsolete.dto";
import { PartialUpdateDatasetObsoleteDto } from "./dto/update-dataset-obsolete.dto";
import {
  PartialUpdateDatasetDto,
  PartialUpdateDatasetLifecycleDto,
  UpdateDatasetDto,
  UpdateDatasetLifecycleDto,
} from "./dto/update-dataset.dto";
import {
  PartialUpdateDerivedDatasetObsoleteDto,
  UpdateDerivedDatasetObsoleteDto,
} from "./dto/update-derived-dataset-obsolete.dto";
import {
  PartialUpdateRawDatasetObsoleteDto,
  UpdateRawDatasetObsoleteDto,
} from "./dto/update-raw-dataset-obsolete.dto";
import {
  MainDatasetsPublicInterceptor,
  SubDatasetsPublicInterceptor,
} from "./interceptors/datasets-public.interceptor";
import { FullQueryInterceptor } from "./interceptors/fullquery.interceptor";
import {
  IDatasetFields,
  IDatasetFiltersV3,
} from "./interfaces/dataset-filters.interface";
import { DatasetClass, DatasetDocument } from "./schemas/dataset.schema";
import { HistoryClass } from "./schemas/history.schema";
import { LifecycleClass } from "./schemas/lifecycle.schema";
import { RelationshipClass } from "./schemas/relationship.schema";
import { TechniqueClass } from "./schemas/technique.schema";
import { DatasetType } from "./types/dataset-type.enum";
import { HistoryService } from "src/history/history.service";
import { convertGenericHistoriesToObsoleteHistories } from "src/datasets/utils/history.util";
import { IncludeValidationPipe } from "src/common/pipes/include-validation.pipe";
import { DATASET_LOOKUP_FIELDS } from "./types/dataset-lookup";
import { getSwaggerDatasetFilterContentV3 } from "./types/dataset-filter-content.v3";
import { Filter } from "./decorators/filter.decorator";
import { checkUnmodifiedSince } from "src/common/utils/check-unmodified-since";

@ApiBearerAuth()
@ApiExtraModels(
  CreateAttachmentV3Dto,
  CreateDerivedDatasetObsoleteDto,
  CreateRawDatasetObsoleteDto,
  HistoryClass,
  TechniqueClass,
  RelationshipClass,
)
@ApiTags("datasets")
@Controller({ path: "datasets", version: "3" })
export class DatasetsController {
  constructor(
    private attachmentsService: AttachmentsService,
    private datablocksService: DatablocksService,
    private datasetsService: DatasetsService,
    private origDatablocksService: OrigDatablocksService,
    private caslAbilityFactory: CaslAbilityFactory,
    private logbooksService: LogbooksService,
    private configService: ConfigService,
    private historyService: HistoryService,
  ) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
    this.datasetCreationValidationEnabled = this.configService.get<boolean>(
      "datasetCreationValidationEnabled",
    );
    this.datasetCreationValidationRegex = this.configService.get<string>(
      "datasetCreationValidationRegex",
    );
    this.datasetTypes = this.configService.get<string>("datasetTypes");
  }
  private accessGroups;
  private datasetCreationValidationEnabled;
  private datasetCreationValidationRegex;
  private datasetTypes;

  updateMergedFiltersForList(
    request: Request,
    mergedFilters: IFilters<DatasetDocument, IDatasetFields>,
  ): IFilters<DatasetDocument, IDatasetFields> {
    const user: JWTUser = request.user as JWTUser;

    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    const canViewAny = ability.can(Action.DatasetReadAny, DatasetClass);
    const canViewOwner = ability.can(Action.DatasetReadManyOwner, DatasetClass);
    const canViewAccess = ability.can(
      Action.DatasetReadManyAccess,
      DatasetClass,
    );
    const canViewPublic = ability.can(
      Action.DatasetReadManyPublic,
      DatasetClass,
    );

    if (!mergedFilters.where) {
      mergedFilters.where = {};
    }

    if (!canViewAny) {
      if (canViewAccess) {
        if (mergedFilters.where["$and"]) {
          mergedFilters.where["$and"].push({
            $or: [
              { ownerGroup: { $in: user.currentGroups } },
              { accessGroups: { $in: user.currentGroups } },
              { sharedWith: { $in: [user.email] } },
              { isPublished: true },
            ],
          });
        } else {
          mergedFilters.where["$and"] = [
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
        mergedFilters.where = {
          ...mergedFilters.where,
          ownerGroup: { $in: user.currentGroups },
        };
      } else if (canViewPublic) {
        mergedFilters.where = {
          ...mergedFilters.where,
          isPublished: true,
        };
      }
    }

    mergedFilters.where = this.convertObsoleteWhereFilterToCurrentSchema(
      mergedFilters.where,
    );

    return mergedFilters;
  }

  async checkPermissionsForDatasetExtended(
    request: Request,
    id: string,
    group: Action,
  ) {
    const dataset = await this.datasetsService.findOne({ where: { pid: id } });
    const user: JWTUser = request.user as JWTUser;

    if (!dataset) {
      throw new NotFoundException(`dataset: ${id} not found`);
    }

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
    } else if (group == Action.DatasetAttachmentRead) {
      canDoAction =
        ability.can(Action.DatasetAttachmentReadAny, DatasetClass) ||
        ability.can(Action.DatasetAttachmentReadOwner, datasetInstance) ||
        ability.can(Action.DatasetAttachmentReadAccess, datasetInstance) ||
        ability.can(Action.DatasetAttachmentReadPublic, datasetInstance);
    } else if (group == Action.DatasetAttachmentCreate) {
      canDoAction =
        ability.can(Action.DatasetAttachmentCreateAny, DatasetClass) ||
        ability.can(Action.DatasetAttachmentCreateOwner, datasetInstance);
    } else if (group == Action.DatasetAttachmentUpdate) {
      canDoAction =
        ability.can(Action.DatasetAttachmentUpdateAny, DatasetClass) ||
        ability.can(Action.DatasetAttachmentUpdateOwner, datasetInstance);
    } else if (group == Action.DatasetAttachmentDelete) {
      canDoAction =
        ability.can(Action.DatasetAttachmentDeleteAny, DatasetClass) ||
        ability.can(Action.DatasetAttachmentDeleteOwner, datasetInstance);
    } else if (group == Action.DatasetOrigdatablockRead) {
      canDoAction =
        ability.can(Action.DatasetOrigdatablockReadAny, DatasetClass) ||
        ability.can(Action.DatasetOrigdatablockReadOwner, datasetInstance) ||
        ability.can(Action.DatasetOrigdatablockReadAccess, datasetInstance) ||
        ability.can(Action.DatasetOrigdatablockReadPublic, datasetInstance);
    } else if (group == Action.DatasetOrigdatablockCreate) {
      canDoAction =
        ability.can(Action.DatasetOrigdatablockCreateAny, DatasetClass) ||
        ability.can(Action.DatasetOrigdatablockCreateOwner, datasetInstance);
    } else if (group == Action.DatasetOrigdatablockUpdate) {
      canDoAction =
        ability.can(Action.DatasetOrigdatablockUpdateAny, DatasetClass) ||
        ability.can(Action.DatasetOrigdatablockUpdateOwner, datasetInstance);
    } else if (group == Action.DatasetOrigdatablockDelete) {
      canDoAction =
        ability.can(Action.DatasetOrigdatablockDeleteAny, DatasetClass) ||
        ability.can(Action.DatasetOrigdatablockDeleteOwner, datasetInstance);
    } else if (group == Action.DatasetDatablockRead) {
      canDoAction =
        ability.can(Action.DatasetOrigdatablockReadAny, DatasetClass) ||
        ability.can(Action.DatasetDatablockReadOwner, datasetInstance) ||
        ability.can(Action.DatasetDatablockReadAccess, datasetInstance) ||
        ability.can(Action.DatasetDatablockReadPublic, datasetInstance);
    } else if (group == Action.DatasetDatablockCreate) {
      canDoAction =
        ability.can(Action.DatasetDatablockCreateAny, DatasetClass) ||
        ability.can(Action.DatasetDatablockCreateOwner, datasetInstance);
    } else if (group == Action.DatasetDatablockUpdate) {
      canDoAction =
        ability.can(Action.DatasetDatablockUpdateAny, DatasetClass) ||
        ability.can(Action.DatasetDatablockUpdateOwner, datasetInstance);
    } else if (group == Action.DatasetDatablockDelete) {
      canDoAction =
        ability.can(Action.DatasetDatablockDeleteAny, DatasetClass) ||
        ability.can(Action.DatasetDatablockDeleteOwner, datasetInstance);
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

  async checkPermissionsForDatasetObsolete(request: Request, id: string) {
    const dataset = await this.findOrThrow(id);
    const user: JWTUser = request.user as JWTUser;

    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(dataset);

    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    const canView =
      ability.can(Action.DatasetReadAny, DatasetClass) ||
      ability.can(Action.DatasetReadOneOwner, datasetInstance) ||
      ability.can(Action.DatasetReadOneAccess, datasetInstance) ||
      ability.can(Action.DatasetReadOnePublic, datasetInstance);

    if (!canView) {
      throw new ForbiddenException("Unauthorized access");
    }

    return dataset;
  }

  private async findOrThrow(id: string) {
    const dataset = await this.datasetsService.findOne({ where: { pid: id } });

    if (!dataset) throw new NotFoundException(`dataset: ${id} not found`);
    return dataset;
  }

  getUserPermissionsFromGroups(user: JWTUser) {
    const userIsAdmin = user.currentGroups.some((g) =>
      this.accessGroups?.admin.includes(g),
    );
    const userCanCreateDatasetPrivileged =
      this.accessGroups?.createDatasetPrivileged.some((value) =>
        user.currentGroups.includes(value),
      );
    const userCanCreateDatasetWithPid =
      this.accessGroups?.createDatasetWithPid.some((value) =>
        user.currentGroups.includes(value),
      );
    const userCanCreateDatasetWithoutPid =
      this.accessGroups?.createDataset.some((value) =>
        user.currentGroups.includes(value),
      );

    return {
      userIsAdmin,
      userCanCreateDatasetPrivileged,
      userCanCreateDatasetWithPid,
      userCanCreateDatasetWithoutPid,
    };
  }

  async generateDatasetInstanceForPermissions(
    dataset:
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | CreateDatasetDto
      | DatasetClass,
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

  async checkPermissionsForObsoleteDatasetCreate(
    request: Request,
    dataset:
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | CreateDatasetDto,
  ) {
    const user: JWTUser = request.user as JWTUser;

    // NOTE: We need DatasetClass instance because casl module can not recognize the type from dataset mongo database model. If other fields are needed can be added later.
    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(dataset);
    // instantiate the casl matrix for the user
    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    // check if he/she can create this dataset
    const canCreate =
      ability.can(Action.DatasetCreateAny, DatasetClass) ||
      ability.can(Action.DatasetCreateOwnerNoPid, datasetInstance) ||
      ability.can(Action.DatasetCreateOwnerWithPid, datasetInstance);

    if (!canCreate) {
      throw new ForbiddenException("Unauthorized to create this dataset");
    }

    // now checks if we need to validate the pid
    if (
      this.datasetCreationValidationEnabled &&
      this.datasetCreationValidationRegex &&
      dataset.pid
    ) {
      const re = new RegExp(this.datasetCreationValidationRegex);

      if (!re.test(dataset.pid)) {
        throw new BadRequestException(
          "PID is not following required standards",
        );
      }
    }

    return dataset;
  }

  convertObsoleteWhereFilterToCurrentSchema(
    whereFilter: Record<string, unknown>,
  ): IFilters<DatasetDocument, IDatasetFields> {
    if ("proposalId" in whereFilter) {
      whereFilter.proposalIds = whereFilter.proposalId;
      delete whereFilter.proposalId;
    }
    if ("sampleId" in whereFilter) {
      whereFilter.sampleIds = whereFilter.sampleId;
      delete whereFilter.sampleId;
    }
    if ("instrumentId" in whereFilter) {
      whereFilter.instrumentIds = whereFilter.instrumentId;
      delete whereFilter.instrumentId;
    }
    if ("investigator" in whereFilter) {
      if (typeof whereFilter.investigator === "string") {
        whereFilter.principalInvestigators = {
          $in: [whereFilter.investigator],
        };
      } else {
        whereFilter.principalInvestigators = whereFilter.investigator;
      }

      delete whereFilter.investigator;
    }
    if ("principalInvestigator" in whereFilter) {
      if (typeof whereFilter.investigator === "string") {
        whereFilter.principalInvestigators = {
          $in: [whereFilter.principalInvestigator],
        };
      } else {
        whereFilter.principalInvestigators = whereFilter.principalInvestigator;
      }
      delete whereFilter.principalInvestigator;
    }

    return whereFilter;
  }
  convertObsoleteToCurrentSchema(
    inputObsoleteDataset:
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | CreateDatasetDto
      | UpdateRawDatasetObsoleteDto
      | UpdateDerivedDatasetObsoleteDto
      | UpdateDatasetDto
      | PartialUpdateRawDatasetObsoleteDto
      | PartialUpdateDerivedDatasetObsoleteDto
      | PartialUpdateDatasetDto,
  ): CreateDatasetDto | UpdateDatasetDto | PartialUpdateDatasetDto {
    const propertiesModifier: Record<string, unknown> = {};

    if ("proposalId" in inputObsoleteDataset) {
      propertiesModifier.proposalIds = [
        (inputObsoleteDataset as CreateRawDatasetObsoleteDto).proposalId,
      ];
    }
    if (
      inputObsoleteDataset instanceof CreateRawDatasetObsoleteDto ||
      inputObsoleteDataset instanceof UpdateRawDatasetObsoleteDto ||
      inputObsoleteDataset instanceof PartialUpdateRawDatasetObsoleteDto
    ) {
      if ("sampleId" in inputObsoleteDataset) {
        propertiesModifier.sampleIds = [
          (inputObsoleteDataset as CreateRawDatasetObsoleteDto).sampleId,
        ];
      }
      if ("instrumentId" in inputObsoleteDataset) {
        propertiesModifier.instrumentIds = [
          (inputObsoleteDataset as CreateRawDatasetObsoleteDto).instrumentId,
        ];
      }
      if ("principalInvestigator" in inputObsoleteDataset) {
        propertiesModifier.principalInvestigators = [
          (inputObsoleteDataset as CreateRawDatasetObsoleteDto)
            .principalInvestigator,
        ];
      }
    } else if (
      inputObsoleteDataset instanceof CreateDerivedDatasetObsoleteDto ||
      inputObsoleteDataset instanceof UpdateDerivedDatasetObsoleteDto ||
      inputObsoleteDataset instanceof PartialUpdateDerivedDatasetObsoleteDto
    ) {
      if ("investigator" in inputObsoleteDataset) {
        propertiesModifier.principalInvestigators = [
          (inputObsoleteDataset as CreateDerivedDatasetObsoleteDto)
            .investigator,
        ];
      }
    }

    let outputDataset:
      | CreateDatasetDto
      | UpdateDatasetDto
      | PartialUpdateDatasetDto = {};
    if (
      inputObsoleteDataset instanceof CreateRawDatasetObsoleteDto ||
      inputObsoleteDataset instanceof CreateDerivedDatasetObsoleteDto ||
      inputObsoleteDataset instanceof CreateDatasetDto
    ) {
      outputDataset = {
        ...(inputObsoleteDataset as CreateDatasetDto),
        ...propertiesModifier,
      } as CreateDatasetDto;
    } else if (
      inputObsoleteDataset instanceof UpdateRawDatasetObsoleteDto ||
      inputObsoleteDataset instanceof UpdateDerivedDatasetObsoleteDto ||
      inputObsoleteDataset instanceof UpdateDatasetDto
    ) {
      outputDataset = {
        ...(inputObsoleteDataset as UpdateDatasetDto),
        ...propertiesModifier,
      } as UpdateDatasetDto;
    } else if (
      inputObsoleteDataset instanceof PartialUpdateRawDatasetObsoleteDto ||
      inputObsoleteDataset instanceof PartialUpdateDerivedDatasetObsoleteDto ||
      inputObsoleteDataset instanceof PartialUpdateDatasetDto
    ) {
      outputDataset = {
        ...(inputObsoleteDataset as PartialUpdateDatasetDto),
        ...propertiesModifier,
      } as PartialUpdateDatasetDto;
    }

    return outputDataset;
  }

  async convertCurrentToObsoleteSchema(
    inputDataset: DatasetDocument | null,
    fields?: IDatasetFields,
  ): Promise<OutputDatasetObsoleteDto> {
    const propertiesModifier: Record<string, unknown> = {};
    if (inputDataset) {
      if ("proposalIds" in inputDataset && inputDataset.proposalIds?.length) {
        propertiesModifier.proposalId = inputDataset.proposalIds[0];
      }
      if ("sampleIds" in inputDataset && inputDataset.sampleIds?.length) {
        propertiesModifier.sampleId = inputDataset.sampleIds[0];
      }
      if (
        "instrumentIds" in inputDataset &&
        inputDataset.instrumentIds?.length
      ) {
        propertiesModifier.instrumentId = inputDataset.instrumentIds[0];
      }

      if (
        "principalInvestigators" in inputDataset &&
        inputDataset.principalInvestigators?.length
      ) {
        propertiesModifier.principalInvestigator =
          inputDataset.principalInvestigators[0];
      }

      if (inputDataset.type == "derived") {
        if (
          "investigator" in inputDataset &&
          inputDataset.principalInvestigators?.length
        ) {
          propertiesModifier.investigator =
            inputDataset.principalInvestigators[0];
        }
      }

      if (Array.isArray(fields) && fields.includes("history"))
        propertiesModifier.history = await this.convertToObsoleteHistory(
          inputDataset._id,
        );
    }

    const outputDataset = {
      ...((inputDataset as DatasetDocument).toObject?.() ?? inputDataset),
      ...propertiesModifier,
    };

    return plainToInstance(OutputDatasetObsoleteDto, outputDataset);
  }

  private async convertToObsoleteHistory(datasetId: string) {
    const currentDataset = (await this.datasetsService.findOne({
      where: { pid: datasetId },
    })) as DatasetDocument;
    return convertGenericHistoriesToObsoleteHistories(
      await this.historyService.find({
        documentId: datasetId,
        subsystem: "Dataset",
      }),
      currentDataset,
    ).reverse();
  }

  // POST https://scicat.ess.eu/api/v3/datasets
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
      "It creates a new dataset which can be a raw, derived or custom one.",
    description:
      "It creates a new dataset and returns it completed with systems fields.",
  })
  @ApiExtraModels(
    CreateRawDatasetObsoleteDto,
    CreateDerivedDatasetObsoleteDto,
    CreateDatasetDto,
  )
  @ApiBody({
    description: "Input fields for the dataset to be created",
    required: true,
    schema: {
      anyOf: [
        { $ref: getSchemaPath(CreateRawDatasetObsoleteDto) },
        { $ref: getSchemaPath(CreateDerivedDatasetObsoleteDto) },
        { $ref: getSchemaPath(CreateDatasetDto) },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: OutputDatasetObsoleteDto,
    description: "Create a new dataset and return its representation in SciCat",
  })
  async create(
    @Req() request: Request,
    @Body()
    createDatasetObsoleteDto:
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | CreateDatasetDto,
  ): Promise<OutputDatasetObsoleteDto> {
    // validate dataset
    let dtoType;
    switch (createDatasetObsoleteDto.type) {
      case DatasetType.Raw:
        dtoType = CreateRawDatasetObsoleteDto;
        break;
      case DatasetType.Derived:
        dtoType = CreateDerivedDatasetObsoleteDto;
        break;
      default:
        dtoType = CreateDatasetDto;
        break;
    }

    const validatedDatasetObsoleteDto = (await this.validateDatasetObsolete(
      createDatasetObsoleteDto,
      dtoType,
    )) as
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | CreateDatasetDto;

    const obsoleteDatasetDto =
      await this.checkPermissionsForObsoleteDatasetCreate(
        request,
        validatedDatasetObsoleteDto,
      );

    try {
      const datasetDto = this.convertObsoleteToCurrentSchema(
        obsoleteDatasetDto,
      ) as CreateDatasetDto;
      const createdDataset = await this.datasetsService.create(datasetDto);
      const outputObsoleteDatasetDto =
        await this.convertCurrentToObsoleteSchema(createdDataset);

      return outputObsoleteDatasetDto;
    } catch (error) {
      if ((error as MongoError).code === 11000) {
        throw new ConflictException(
          `A dataset with pid ${obsoleteDatasetDto.pid?.trim() ? obsoleteDatasetDto.pid : "unknown"} already exists!`,
        );
      } else {
        throw new InternalServerErrorException(error);
      }
    }
  }

  async validateDatasetObsolete(
    inputDatasetDto:
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | CreateDatasetDto
      | PartialUpdateRawDatasetObsoleteDto
      | PartialUpdateDerivedDatasetObsoleteDto
      | PartialUpdateDatasetDto
      | UpdateRawDatasetObsoleteDto
      | UpdateDerivedDatasetObsoleteDto
      | UpdateDatasetDto,
    dto: ClassConstructor<
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | CreateDatasetDto
      | PartialUpdateRawDatasetObsoleteDto
      | PartialUpdateDerivedDatasetObsoleteDto
      | PartialUpdateDatasetDto
      | UpdateRawDatasetObsoleteDto
      | UpdateDerivedDatasetObsoleteDto
      | UpdateDatasetDto
    >,
  ) {
    const validateOptions: ValidatorOptions = {
      whitelist: true,
      forbidNonWhitelisted: true,
      forbidUnknownValues: true,
      validationError: {
        value: false,
        target: false,
      },
    };

    // first we convert input object to the correct class
    const outputDatasetDto = plainToInstance(dto, inputDatasetDto);

    if (
      outputDatasetDto instanceof
      (CreateRawDatasetObsoleteDto ||
        CreateDerivedDatasetObsoleteDto ||
        CreateDatasetDto)
    ) {
      if (
        this.datasetTypes &&
        !Object.values(this.datasetTypes).includes(outputDatasetDto.type)
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: "Invalid dataset type!",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const errors = await validate(outputDatasetDto, validateOptions);

    if (errors.length > 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: JSON.stringify(errors),
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    return outputDatasetDto;
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
  @ApiExtraModels(
    CreateRawDatasetObsoleteDto,
    CreateDerivedDatasetObsoleteDto,
    CreateDatasetDto,
  )
  @ApiBody({
    description: "Input fields for the dataset that needs to be validated",
    required: true,
    schema: {
      anyOf: [
        { $ref: getSchemaPath(CreateRawDatasetObsoleteDto) },
        { $ref: getSchemaPath(CreateDerivedDatasetObsoleteDto) },
        { $ref: getSchemaPath(CreateDatasetDto) },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: IsValidResponse,
    description:
      "Check if the dataset provided pass validation. It return true if the validation is passed",
  })
  async isValid(
    @Req() request: Request,
    @Body()
    createDatasetObsoleteDto:
      | CreateRawDatasetObsoleteDto
      | CreateDerivedDatasetObsoleteDto
      | CreateDatasetDto,
  ): Promise<{ valid: boolean }> {
    await this.checkPermissionsForObsoleteDatasetCreate(
      request,
      createDatasetObsoleteDto,
    );

    const dtoTestRawCorrect = plainToInstance(
      CreateRawDatasetObsoleteDto,
      createDatasetObsoleteDto,
    );
    const errorsTestRawCorrect = await validate(dtoTestRawCorrect);

    const dtoTestDerivedCorrect = plainToInstance(
      CreateDerivedDatasetObsoleteDto,
      createDatasetObsoleteDto,
    );
    const errorsTestDerivedCorrect = await validate(dtoTestDerivedCorrect);

    const dtoTestCustomCorrect = plainToInstance(
      CreateDatasetDto,
      createDatasetObsoleteDto,
    );
    const errorsTestCustomCorrect = await validate(dtoTestCustomCorrect);

    const valid =
      errorsTestRawCorrect.length == 0 ||
      errorsTestDerivedCorrect.length == 0 ||
      errorsTestCustomCorrect.length == 0;

    return { valid: valid };
  }

  // GET /datasets
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadManyPublic, DatasetClass),
  )
  @UseInterceptors(MainDatasetsPublicInterceptor)
  @Get()
  @ApiOperation({
    summary: "It returns a list of datasets.",
    description:
      "It returns a list of datasets. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving datasets\n" +
      filterDescription,
    required: false,
    type: String,
    content: getSwaggerDatasetFilterContentV3(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetObsoleteDto,
    isArray: true,
    description: "Return the datasets requested",
  })
  async findAll(
    @Req() request: Request,
    @Filter(new FilterPipe())
    queryFilter: { filter?: IFilters<DatasetDocument, IDatasetFields> },
  ): Promise<OutputDatasetObsoleteDto[]> {
    const mergedFilters = this.updateMergedFiltersForList(
      request,
      queryFilter.filter ?? {},
    ) as IDatasetFiltersV3<DatasetDocument, IDatasetFields>;
    if (queryFilter.filter)
      new IncludeValidationPipe(DATASET_LOOKUP_FIELDS).transform(
        JSON.stringify(queryFilter.filter),
      );
    const datasets = await this.datasetsService.findAllComplete(
      mergedFilters,
      false,
    );
    return Promise.all(
      (datasets as DatasetDocument[]).map((dataset) =>
        this.convertCurrentToObsoleteSchema(dataset, mergedFilters?.fields),
      ),
    );
  }
  // GET /datasets/fullquery
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadManyPublic, DatasetClass),
  )
  @UseInterceptors(SubDatasetsPublicInterceptor, FullQueryInterceptor)
  @Get("/fullquery")
  @ApiOperation({
    summary: "It returns a list of datasets matching the query provided.",
    description:
      "It returns a list of datasets matching the query provided.<br>This endpoint still needs some work on the query specification.",
  })
  @ApiQuery({
    name: "fields",
    description:
      "Database filters to apply when retrieving datasets\n" +
      datasetsFullQueryDescriptionFields,
    required: false,
    type: String,
    example: datasetsFullQueryExampleFields,
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
    type: OutputDatasetObsoleteDto,
    isArray: true,
    description: "Return fullquery response for datasets requested",
  })
  async fullquery(
    @Req() request: Request,
    @Query() filters: { fields?: string; limits?: string },
  ): Promise<OutputDatasetObsoleteDto[]> {
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
      } else {
        fields.isPublished = true;
      }
    }

    const parsedFilters: IFilters<DatasetDocument, IDatasetFields> = {
      fields: fields,
      limits: JSON.parse(filters.limits ?? "{}"),
    };

    const datasets = await this.datasetsService.fullquery(parsedFilters);

    let outputDatasets: OutputDatasetObsoleteDto[] = [];

    if (datasets && datasets.length > 0) {
      outputDatasets = await Promise.all(
        datasets.map((dataset) =>
          this.convertCurrentToObsoleteSchema(dataset, parsedFilters.fields),
        ),
      );
    }

    return outputDatasets as OutputDatasetObsoleteDto[];
  }

  // GET /fullfacets
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadManyPublic, DatasetClass),
  )
  @UseInterceptors(SubDatasetsPublicInterceptor)
  @Get("/fullfacet")
  @ApiQuery({
    name: "fields",
    description:
      "Define the filter conditions by specifying the name of values of fields requested. There is also support for a `text` search to look for strings anywhere in the dataset.",
    required: false,
    type: String,
    example: {},
  })
  @ApiQuery({
    name: "facets",
    description:
      "Defines list of field names, for which facet counts should be calculated",
    required: false,
    type: String,
    example: '["type","creationLocation","ownerGroup","keywords"]',
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
      } else {
        fields.isPublished = true;
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
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadManyPublic, DatasetClass),
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
    description: "Return metadata keys  for list of datasets selected",
  })
  async metadataKeys(
    @Req() request: Request,
    @Query() filters: { fields?: string; limits?: string },
  ) {
    const user: JWTUser = request.user as JWTUser;
    const fields: IDatasetFields = JSON.parse(filters.fields ?? "{}");

    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    const canViewAny = ability.can(Action.DatasetReadAny, DatasetClass);

    if (!canViewAny && !fields.isPublished) {
      // delete fields.isPublished;

      const canViewAccess = ability.can(
        Action.DatasetReadManyAccess,
        DatasetClass,
      );
      const canViewOwner = ability.can(
        Action.DatasetReadManyOwner,
        DatasetClass,
      );
      // const canViewPublic = ability.can(
      //   Action.DatasetReadManyPublic,
      //   DatasetClass,
      // );

      if (canViewAccess) {
        fields.userGroups?.push(...user.currentGroups);
        // fields.sharedWith = user.email;
        // fields.isPublished = true; //are they in or?
      } else if (canViewOwner) {
        fields.ownerGroup?.push(...user.currentGroups);
      }
      // else if (canViewPublic) {
      //   fields.isPublished = true;
      // }
    }

    const parsedFilters: IFilters<DatasetDocument, IDatasetFields> = {
      fields: fields,
      limits: JSON.parse(filters.limits ?? "{}"),
    };
    return this.datasetsService.metadataKeys(parsedFilters);
  }

  // GET /datasets/findOne
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadOnePublic, DatasetClass),
  )
  @Get("/findOne")
  @ApiOperation({
    summary: "It returns the first dataset found.",
    description:
      "It returns the first dataset of the ones that matches the filter provided. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving datasets\n" +
      filterDescription,
    required: false,
    type: String,
    content: getSwaggerDatasetFilterContentV3(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetObsoleteDto,
    description: "Return the datasets requested",
  })
  async findOne(
    @Req() request: Request,
    @Filter(new FilterPipe())
    queryFilter: { filter?: IFilters<DatasetDocument, IDatasetFields> },
  ): Promise<OutputDatasetObsoleteDto | null> {
    const filter = queryFilter.filter ?? {};
    filter.limits = { limit: 1, ...(filter.limits ?? {}) };
    const dataset = await this.findAll(request, {
      filter: filter,
    });
    return dataset[0] as OutputDatasetObsoleteDto;
  }

  // GET /datasets/count
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadManyPublic, DatasetClass),
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
    example:
      '{"where": {"pid": "20.500.12269/4f8c991e-a879-4e00-9095-5bb13fb02ac4"}}',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description:
      "Return the number of datasets in the following format: { count: integer }",
  })
  async count(
    @Req() request: Request,
    @Filter(new FilterPipe())
    queryFilter: { filter?: IFilters<DatasetDocument, IDatasetFields> },
  ) {
    const mergedFilters = this.updateMergedFiltersForList(
      request,
      queryFilter.filter ?? {},
    ) as IFilters<DatasetDocument, IDatasetFields>;

    return this.datasetsService.count(mergedFilters);
  }

  // GET /datasets/:id
  //@UseGuards(PoliciesGuard)
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadOnePublic, DatasetClass),
  )
  @Get("/:pid")
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to return",
    type: String,
  })
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving datasets\n" +
      filterDescription,
    required: false,
    type: String,
    content: getSwaggerDatasetFilterContentV3(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetObsoleteDto,
    isArray: false,
    description: "Return dataset with pid specified",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Dataset not found",
  })
  async findById(
    @Req() request: Request,
    @Param("pid") id: string,
    @Filter(new FilterPipe())
    queryFilter: { filter?: IFilters<DatasetDocument, IDatasetFields> },
  ) {
    await this.findOrThrow(id);
    const filterObj = queryFilter.filter ?? {};
    filterObj.where = filterObj.where ?? {};
    filterObj.where.pid = id;
    const dataset = await this.findAll(request, {
      filter: filterObj,
    });
    if (dataset.length == 0)
      throw new ForbiddenException("Unauthorized access");
    if (!filterObj.fields?.length) {
      return {
        ...dataset[0],
        history: await this.convertToObsoleteHistory(dataset[0].pid),
      };
    }
    return dataset[0];
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
    description:
      "It updates the dataset through the pid specified. It updates only the specified fields.",
  })
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to modify",
    type: String,
  })
  @ApiExtraModels(
    PartialUpdateRawDatasetObsoleteDto,
    PartialUpdateDerivedDatasetObsoleteDto,
    PartialUpdateDatasetDto,
  )
  @ApiBody({
    description:
      "Fields that needs to be updated in the dataset. Only the fields that needs to be updated have to be passed in.",
    required: true,
    schema: {
      anyOf: [
        { $ref: getSchemaPath(PartialUpdateRawDatasetObsoleteDto) },
        { $ref: getSchemaPath(PartialUpdateDerivedDatasetObsoleteDto) },
        { $ref: getSchemaPath(PartialUpdateDatasetDto) },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetObsoleteDto,
    description:
      "Update an existing dataset and return its representation in SciCat",
  })
  async findByIdAndUpdate(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body()
    updateDatasetObsoleteDto:
      | PartialUpdateRawDatasetObsoleteDto
      | PartialUpdateDerivedDatasetObsoleteDto
      | PartialUpdateDatasetDto,
  ): Promise<OutputDatasetObsoleteDto | null> {
    const foundDataset = await this.datasetsService.findOne({
      where: { pid },
    });

    if (!foundDataset) {
      throw new NotFoundException();
    }

    //checks if the resource is unmodified since clients timestamp
    checkUnmodifiedSince(
      foundDataset.updatedAt,
      request.headers["if-unmodified-since"],
    );

    // NOTE: Default validation pipe does not validate union types. So we need custom validation.
    let dtoType;
    switch (foundDataset.type) {
      case DatasetType.Raw:
        dtoType = PartialUpdateRawDatasetObsoleteDto;
        break;
      case DatasetType.Derived:
        dtoType = PartialUpdateDerivedDatasetObsoleteDto;
        break;
      default:
        dtoType = PartialUpdateDatasetDto;
        break;
    }
    const validatedUpdateDatasetObsoleteDto =
      (await this.validateDatasetObsolete(
        updateDatasetObsoleteDto,
        dtoType,
      )) as
        | PartialUpdateRawDatasetObsoleteDto
        | PartialUpdateDerivedDatasetObsoleteDto
        | PartialUpdateDatasetDto;

    // NOTE: We need DatasetClass instance because casl module can not recognize the type from dataset mongo database model. If other fields are needed can be added later.
    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(foundDataset);

    // instantiate the casl matrix for the user
    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    // check if he/she can create this dataset
    const canUpdate =
      ability.can(Action.DatasetUpdateAny, DatasetClass) ||
      ability.can(Action.DatasetUpdateOwner, datasetInstance);

    if (!canUpdate) {
      throw new ForbiddenException("Unauthorized to update this dataset");
    }

    const updateDatasetDto = this.convertObsoleteToCurrentSchema(
      validatedUpdateDatasetObsoleteDto,
    ) as UpdateDatasetDto;

    const res = this.convertCurrentToObsoleteSchema(
      await this.datasetsService.findByIdAndUpdate(pid, updateDatasetDto),
    );
    return res;
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
  @ApiExtraModels(
    UpdateRawDatasetObsoleteDto,
    UpdateDerivedDatasetObsoleteDto,
    UpdateDatasetDto,
  )
  @ApiBody({
    description:
      "Dataset object that needs to be updated. The whole dataset object with updated fields have to be passed in.",
    required: true,
    schema: {
      anyOf: [
        { $ref: getSchemaPath(UpdateRawDatasetObsoleteDto) },
        { $ref: getSchemaPath(UpdateDerivedDatasetObsoleteDto) },
        { $ref: getSchemaPath(UpdateDatasetDto) },
      ],
    },
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetObsoleteDto,
    description:
      "Update an existing dataset and return its representation in SciCat",
  })
  async findByIdAndReplace(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body()
    updateDatasetObsoleteDto:
      | UpdateRawDatasetObsoleteDto
      | UpdateDerivedDatasetObsoleteDto
      | UpdateDatasetDto,
  ): Promise<OutputDatasetObsoleteDto | null> {
    const foundDataset = await this.datasetsService.findOne({
      where: { pid },
    });

    if (!foundDataset) {
      throw new NotFoundException();
    }

    // NOTE: Default validation pipe does not validate union types. So we need custom validation.
    let dtoType;
    switch (foundDataset.type) {
      case DatasetType.Raw:
        dtoType = UpdateRawDatasetObsoleteDto;
        break;
      case DatasetType.Derived:
        dtoType = UpdateDerivedDatasetObsoleteDto;
        break;
      default:
        dtoType = UpdateDatasetDto;
        break;
    }

    const updateValidatedDto = await this.validateDatasetObsolete(
      updateDatasetObsoleteDto,
      dtoType,
    );

    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(foundDataset);

    // instantiate the casl matrix for the user
    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    // check if he/she can create this dataset
    const canUpdate =
      ability.can(Action.DatasetUpdateAny, DatasetClass) ||
      ability.can(Action.DatasetUpdateOwner, datasetInstance);

    if (!canUpdate) {
      throw new ForbiddenException("Unauthorized to update this dataset");
    }

    const updateDatasetDto =
      this.convertObsoleteToCurrentSchema(updateValidatedDto);

    const outputDatasetDto = await this.datasetsService.findByIdAndReplace(
      pid,
      updateDatasetDto as UpdateDatasetDto,
    );

    return await this.convertCurrentToObsoleteSchema(outputDatasetDto);
  }

  // GET /datasets/:id/datasetlifecycle
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadOnePublic, DatasetClass),
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
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "Dataset not found",
  })
  async findLifecycleById(@Req() request: Request, @Param("pid") id: string) {
    const dataset = await this.convertCurrentToObsoleteSchema(
      await this.checkPermissionsForDatasetObsolete(request, id),
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

    const currentLifecycle = foundDataset.datasetlifecycle ?? {};
    const updatedLifecycle: LifecycleClass = {
      ...currentLifecycle,
      ...updateDatasetLifecycleDto,
    };
    foundDataset.datasetlifecycle = updatedLifecycle;

    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(foundDataset);

    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);

    const canUpdate =
      ability.can(Action.DatasetUpdateAny, DatasetClass) ||
      ability.can(Action.DatasetUpdateOwner, datasetInstance) ||
      ability.can(Action.DatasetLifecycleUpdateAny, datasetInstance);

    if (!canUpdate) {
      throw new ForbiddenException("Unauthorized to update this dataset");
    }

    const res = await this.convertCurrentToObsoleteSchema(
      await this.datasetsService.findByIdAndUpdate(pid, foundDataset),
    );
    return res.datasetlifecycle;
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
    type: DatasetClass,
    description: "DatasetClass value is returned that is removed",
  })
  async findByIdAndDelete(@Req() request: Request, @Param("pid") pid: string) {
    const foundDataset = await this.datasetsService.findOne({
      where: { pid },
    });

    if (!foundDataset) {
      throw new NotFoundException();
    }

    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(foundDataset);

    // instantiate the casl matrix for the user
    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    // check if he/she can create this dataset
    const canUpdate =
      ability.can(Action.DatasetDeleteAny, DatasetClass) ||
      ability.can(Action.DatasetDeleteOwner, datasetInstance);

    if (!canUpdate) {
      throw new ForbiddenException("Unauthorized to update this dataset");
    }

    return this.datasetsService.findByIdAndDelete(pid);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetUpdate, DatasetClass),
  )
  @Post("/:pid/appendToArrayField")
  @ApiOperation({
    summary: "It appends a new value to the specific field.",
    description:
      "It appends a new value to the specified field of the dataset with provided pid.<br>The SciCat project is reviewing the purpose of this function and will decide if it will be dropped or changed",
  })
  @ApiParam({
    name: "pid",
    description: "Id of the dataset to be modified",
    type: String,
  })
  @ApiQuery({
    name: "fieldName",
    description: "Name of the field to be updated",
    type: String,
  })
  @ApiQuery({
    name: "data",
    description: "Json object with the fields to be updated and their values",
    required: true,
    type: Array,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputDatasetObsoleteDto,
    description: "Return new value of the dataset",
  })
  async appendToArrayField(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Query("fieldName") fieldName: string,
    @Query("data") data: string,
  ): Promise<OutputDatasetObsoleteDto | null> {
    const user: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
    const datasetToUpdate = await this.datasetsService.findOne({
      where: { pid },
    });

    if (!datasetToUpdate) {
      throw new NotFoundException();
    }

    const datasetInstance =
      await this.generateDatasetInstanceForPermissions(datasetToUpdate);

    // check if he/she can create this dataset
    const canUpdate =
      ability.can(Action.DatasetDeleteAny, DatasetClass) ||
      ability.can(Action.DatasetDeleteOwner, datasetInstance);

    if (!canUpdate) {
      throw new ForbiddenException("Unauthorized to update this dataset");
    }

    const parsedData = JSON.parse(data);

    const updateQuery: UpdateQuery<DatasetDocument> = {
      $addToSet: {
        [fieldName]: { $each: parsedData },
      },
    };

    const outputDatasetDto = await this.datasetsService.findByIdAndUpdate(
      pid,
      updateQuery,
    );

    return await this.convertCurrentToObsoleteSchema(outputDatasetDto);
  }

  // GET /datasets/:id/thumbnail
  @UseGuards(PoliciesGuard)
  @CheckPolicies(
    "datasets",
    (ability: AppAbility) =>
      ability.can(Action.DatasetRead, DatasetClass) ||
      ability.can(Action.DatasetReadOnePublic, DatasetClass),
  )
  // @UseGuards(PoliciesGuard)
  @Get("/:pid/thumbnail")
  @ApiOperation({
    summary: "It returns the thumbnail associated with the dataset.",
    description:
      "It returns the thumbnail associated with the dataset with the provided pid.",
  })
  @ApiParam({
    name: "pid",
    description: "Persistent identifier of the dataset",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Attachment,
    description: "Return new value of the dataset",
  })
  async thumbnail(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<Partial<Attachment>> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetRead,
    );

    const attachment = await this.attachmentsService.findOne(
      { datasetId: pid },
      { _id: false, thumbnail: true },
    );

    if (!attachment || !attachment.thumbnail) {
      return {};
    }

    return attachment;
  }

  // POST /datasets/:id/attachments
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetAttachmentCreate, DatasetClass),
  )
  @HttpCode(HttpStatus.CREATED)
  @Post("/:pid/attachments")
  @ApiOperation({
    summary: "It creates a new attachement for the dataset specified.",
    description:
      "It creates a new attachement for the dataset specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persisten identifier of the dataset we would like to create a new attachment for",
    type: String,
  })
  @ApiExtraModels(CreateAttachmentV3Dto)
  @ApiBody({
    type: CreateAttachmentV3Dto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: Attachment,
    description:
      "Returns the new attachment for the dataset identified by the pid specified",
  })
  async createAttachment(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body() createAttachmentDto: CreateAttachmentV3Dto,
  ): Promise<OutputAttachmentV3Dto | null> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetAttachmentCreate,
    );

    if (dataset) {
      const createAttachment: CreateAttachmentV3Dto = {
        ...createAttachmentDto,
        datasetId: pid,
        ownerGroup: dataset.ownerGroup,
      };
      return this.attachmentsService.create(createAttachment);
    }
    return null;
  }

  // GET /datasets/:id/attachments/count
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetAttachmentRead, DatasetClass),
  )
  @Get("/:pid/attachments/count")
  @ApiOperation({
    summary: "It returns the attachments count for the dataset specified.",
    description:
      "It returns the attachments count for the dataset specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persisten Identifier of the dataset for which we would like to retrieve the count of all attachments",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    isArray: true,
    description:
      "Return the number of attachments for the pid in the following format: { count: integer }",
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
  async attachmentsCount(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<CountApiResponse> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetAttachmentRead,
    );

    return this.attachmentsService.count({ where: { datasetId: pid } });
  }

  // GET /datasets/:id/attachments
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetAttachmentRead, DatasetClass),
  )
  @Get("/:pid/attachments")
  @ApiOperation({
    summary: "It returns all the attachments for the dataset specified.",
    description:
      "It returns all the attachments for the dataset specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persisten Identifier of the dataset for which we would like to retrieve all the attachments",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Attachment,
    isArray: true,
    description:
      "Array with all the attachments associated with the dataset with the pid specified",
  })
  async findAllAttachments(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<OutputAttachmentV3Dto[]> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetAttachmentRead,
    );

    return this.attachmentsService.findAll({ datasetId: pid });
  }

  // PATCH /datasets/:id/attachments/:fk
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetAttachmentUpdate, DatasetClass),
  )
  @Put("/:pid/attachments/:aid")
  @ApiOperation({
    summary: "It updates the attachment specified for the dataset indicated.",
    description:
      "It updates the dataset specified by the aid parameter for the dataset indicated by the pid parameter.<br>This endpoint is obsolete and it will removed in future version.<br>Attachments can be updated from the attachment endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persisten identifier of the dataset for which we would like to update the attachment specified",
    type: String,
  })
  @ApiParam({
    name: "aid",
    description:
      "Identifier of the attachment of this dataset that we would like to patch",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Attachment,
    isArray: false,
    description: "Returns the attachment updated.",
  })
  async findOneAttachmentAndUpdate(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Param("aid") aid: string,
    @Body() updateAttachmentDto: UpdateAttachmentV3Dto,
  ): Promise<OutputAttachmentV3Dto | null> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetAttachmentUpdate,
    );

    return this.attachmentsService.findOneAndUpdate(
      { _id: aid, datasetId: pid },
      updateAttachmentDto,
    );
  }

  // DELETE /datasets/:pid/attachments/:aid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetAttachmentDelete, DatasetClass),
  )
  @Delete("/:pid/attachments/:aid")
  @ApiOperation({
    summary: "It deletes the attachment from the dataset.",
    description:
      "It deletes the attachment from the dataset.<br>This endpoint is obsolete and will be dropped in future versions.<br>Deleting attachments will be allowed only from the attachments endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to delete the attachment specified",
    type: String,
  })
  @ApiParam({
    name: "aid",
    description:
      "Identifier of the attachment of this dataset that we would like to delete",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "No value is returned.",
  })
  async findOneAttachmentAndRemove(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Param("aid") aid: string,
  ) {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetAttachmentDelete,
    );

    return this.attachmentsService.findOneAndDelete({
      _id: aid,
      datasetId: pid,
    });
  }

  // DELETE /datasets/:pid/attachments
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetAttachmentDelete, DatasetClass),
  )
  @Delete("/:pid/attachments")
  @ApiOperation({
    summary: "It deletes all attachments from the dataset.",
    description:
      "It deletes the attachment from the dataset.<br>This endpoint is obsolete and will be dropped in future versions.<br>Deleting attachments will be allowed only from the attachments endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to delete all attachments",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description:
      "Return the number of deleted attachments in the following format: { count: integer }",
  })
  async findAttachmentsAndRemove(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<CountApiResponse> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetAttachmentDelete,
    );

    const res = await this.attachmentsService.removeMany({
      where: {
        datasetId: pid,
      },
    });
    return { count: res.deletedCount };
  }

  // POST /datasets/:id/origdatablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) => {
    return ability.can(Action.DatasetOrigdatablockCreate, DatasetClass);
  })
  @UseInterceptors(
    new MultiUTCTimeInterceptor<OrigDatablock, DataFile>("dataFileList", [
      "time",
    ]),
  )
  @Post("/:pid/origdatablocks")
  @ApiOperation({
    summary: "It creates a new origDatablock for the dataset specified.",
    description:
      "It creates a new original datablock for the dataset specified by the pid passed.<br>This endpoint is obsolete and will be dropped in future versions.<br>Creatign new origDatablocks will be allowed only from the attachments endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "PErsistent identifier of the dataset we would like to create a new original datablock for",
    type: String,
  })
  @ApiExtraModels(CreateDatasetOrigDatablockDto)
  @ApiBody({
    type: CreateDatasetOrigDatablockDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: OrigDatablock,
    description: "It returns the new original datablock created",
  })
  async createOrigDatablock(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body() createDatasetOrigDatablockDto: CreateDatasetOrigDatablockDto,
  ): Promise<OrigDatablock | null> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetOrigdatablockCreate,
    );

    const createOrigDatablock: CreateOrigDatablockDto = {
      ...createDatasetOrigDatablockDto,
      datasetId: pid,
      ownerGroup: dataset.ownerGroup,
      accessGroups: dataset.accessGroups,
      instrumentGroup: dataset.instrumentGroup,
    };
    const datablock =
      await this.origDatablocksService.create(createOrigDatablock);

    const updateDatasetDto: PartialUpdateDatasetObsoleteDto = {
      size: dataset.size + datablock.size,
      numberOfFiles: dataset.numberOfFiles + datablock.dataFileList.length,
    };
    await this.datasetsService.findByIdAndUpdate(dataset.pid, updateDatasetDto);
    return datablock;
  }

  // POST /datasets/:id/origdatablocks/isValid
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) => {
    return ability.can(Action.DatasetOrigdatablockCreate, DatasetClass);
  })
  @HttpCode(HttpStatus.OK)
  @Post("/:pid/origdatablocks/isValid")
  @ApiOperation({
    summary: "It validates the origDatablock values passed.",
    description:
      "It validates the original datablock values pased as input.<br>This endpoint is obsolete and will be dropped in future versions.<br>Validating orginal datablocks will be allowed only from the datablocks endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset we would like to create a new original datablock for",
    type: String,
  })
  @ApiExtraModels(CreateDatasetOrigDatablockDto)
  @ApiBody({
    type: CreateDatasetOrigDatablockDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description:
      "It returns true if the values passed in are a valid original datablock",
  })
  async origDatablockIsValid(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body() createOrigDatablock: unknown,
  ): Promise<{ valid: boolean; errors: ValidationError[] }> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetOrigdatablockCreate,
    );

    const dtoTestOrigDatablock = plainToInstance(
      CreateDatasetOrigDatablockDto,
      createOrigDatablock,
    );
    const errorsTestOrigDatablock = await validate(dtoTestOrigDatablock);

    const valid = errorsTestOrigDatablock.length == 0;

    return { valid: valid, errors: errorsTestOrigDatablock };
  }

  // GET /datasets/:id/origdatablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) => {
    return ability.can(Action.DatasetOrigdatablockRead, DatasetClass);
  })
  @Get("/:pid/origdatablocks")
  @ApiOperation({
    summary: "It returns all the origDatablock for the dataset specified.",
    description:
      "It returns all the original datablocks for the dataset specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to retrieve all the original datablocks",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OrigDatablock,
    isArray: true,
    description:
      "Array with all the original datablocks associated with the dataset with the pid specified",
  })
  async findAllOrigDatablocks(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<OrigDatablock[]> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetOrigdatablockRead,
    );

    return this.origDatablocksService.findAll({ where: { datasetId: pid } });
  }

  // GET /datasets/:id/origdatablocks/count
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) => {
    return ability.can(Action.DatasetOrigdatablockRead, DatasetClass);
  })
  @Get("/:pid/origdatablocks/count")
  @ApiOperation({
    summary:
      "It returns the count of all the origDatablock for the dataset specified.",
    description:
      "It returns the count of all the original datablocks for the dataset specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to retrieve all the original datablocks",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    isArray: true,
    description:
      "Return the number of origdatablocks for the pid in the following format: { count: integer }",
  })
  async countOrigDatablocks(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<CountApiResponse> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetOrigdatablockRead,
    );
    return this.origDatablocksService.count({ where: { datasetId: pid } });
  }

  // PATCH /datasets/:id/origdatablocks/:fk
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) => {
    return ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass);
  })
  @UseInterceptors(
    new MultiUTCTimeInterceptor<OrigDatablock, DataFile>("dataFileList", [
      "time",
    ]),
  )
  @Patch("/:pid/origdatablocks/:oid")
  @ApiOperation({
    summary:
      "It updates the origDatablocks specified for the dataset indicated.",
    description:
      "It updates the original datablock specified by the aid parameter for the dataset indicated by the pid parameter.<br>This endpoint is obsolete and it will removed in future version.<br>Original datablocks can be updated from the origdatablocks endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to update the original datablocks specified",
    type: String,
  })
  @ApiParam({
    name: "oid",
    description:
      "Identifier of the original datablock of this dataset that we would like to patch",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OrigDatablock,
    isArray: false,
    description:
      "Updated values of the original datablock with id specified associated with the dataset with the pid specified",
  })
  async findOneOrigDatablockAndUpdate(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Param("oid") oid: string,
    @Body() updateOrigdatablockDto: UpdateOrigDatablockDto,
  ): Promise<OrigDatablock | null> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetOrigdatablockUpdate,
    );
    const origDatablockBeforeUpdate = await this.origDatablocksService.findOne({
      _id: oid,
    });

    if (!origDatablockBeforeUpdate)
      throw new NotFoundException(`origDatablock: ${oid} not found`);

    const origDatablock = (await this.origDatablocksService.update(
      { _id: oid },
      updateOrigdatablockDto,
    )) as OrigDatablock;
    await this.datasetsService.findByIdAndUpdate(pid, {
      size: dataset.size - origDatablockBeforeUpdate.size + origDatablock.size,
      numberOfFiles:
        dataset.numberOfFiles -
        origDatablockBeforeUpdate.dataFileList.length +
        origDatablock.dataFileList.length,
    });
    return origDatablock;
  }

  // DELETE /datasets/:id/origdatablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetOrigdatablockDelete, DatasetClass),
  )
  @Delete("/:pid/origdatablocks")
  @ApiOperation({
    summary: "It deletes all origdatablocks from the dataset.",
    description:
      "It deletes all origdatablocks from the dataset.<br>This endpoint is obsolete and will be dropped in future versions.<br>Deleting datablocks will be done only from the datablocks endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to delete the origdatablocks specified",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description:
      "Return the number of deleted origdatablocks in the following format: { count: integer }",
  })
  async deleteAllOrigDatablocksFromDatasetId(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<CountApiResponse> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetDatablockDelete,
    );
    if (!dataset) throw new NotFoundException(`dataset: ${pid} not found`);
    // remove datablock
    const res = await this.origDatablocksService.removeMany({
      datasetId: pid,
    });
    // update dataset size and files number
    await this.datasetsService.findByIdAndUpdate(dataset.pid, {
      size: 0,
      numberOfFiles: 0,
    });
    return { count: res.deletedCount };
  }

  // DELETE /datasets/:id/origdatablocks/:fk
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetOrigdatablockDelete, DatasetClass),
  )
  @Delete("/:pid/origdatablocks/:oid")
  @ApiOperation({
    summary: "It deletes the origdatablock from the dataset.",
    description:
      "It deletes the original datablock from the dataset.<br>This endpoint is obsolete and will be dropped in future versions.<br>Deleting original datablocks will be done only from the origdatablocks endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "PErsistent identifier of the dataset for which we would like to delete the original datablock specified",
    type: String,
  })
  @ApiParam({
    name: "oid",
    description:
      "Identifier of the original datablock of this dataset that we would like to delete",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "No value is returned",
  })
  async findOneOrigDatablockAndRemove(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Param("oid") oid: string,
  ): Promise<unknown> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetOrigdatablockDelete,
    );
    const odb = (await this.origDatablocksService.remove({
      _id: oid,
      datasetId: pid,
    })) as OrigDatablock;
    if (!odb) throw new NotFoundException(`origDatablock: ${oid} not found`);
    // update dataset size and files number
    const updateDatasetDto: PartialUpdateDatasetObsoleteDto = {
      size: dataset.size - odb.size,
      numberOfFiles: dataset.numberOfFiles - odb.dataFileList.length,
    };
    await this.datasetsService.findByIdAndUpdate(dataset.pid, updateDatasetDto);
    return odb;
  }

  // POST /datasets/:id/datablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetDatablockCreate, DatasetClass),
  )
  @UseInterceptors(
    new MultiUTCTimeInterceptor<Datablock, DataFile>("dataFileList", ["time"]),
  )
  @Post("/:pid/datablocks")
  @ApiOperation({
    summary: "It creates a new datablock for the dataset specified.",
    description:
      "It creates a new datablock for the dataset specified by the pid passed.<br>This endpoint is obsolete and will be dropped in future versions.<br>Creating new datablock will be allowed only from the datablocks endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset we would like to create a new datablock for",
    type: String,
  })
  @ApiExtraModels(CreateDatasetDatablockDto)
  @ApiBody({
    type: CreateDatasetDatablockDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: Datablock,
    description: "It returns the new datablock created",
  })
  async createDatablock(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Body() createDatablockDto: CreateDatasetDatablockDto,
  ): Promise<Datablock | null> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetDatablockCreate,
    );
    if (!dataset) throw new NotFoundException(`dataset: ${pid} not found`);

    const createDatablock: CreateDatablockDto = {
      ...createDatablockDto,
      datasetId: pid,
      ownerGroup: dataset.ownerGroup,
      accessGroups: dataset.accessGroups,
      instrumentGroup: dataset.instrumentGroup,
    };
    const datablock = await this.datablocksService.create(createDatablock);
    await this.datasetsService.findByIdAndUpdate(pid, {
      packedSize: (dataset.packedSize ?? 0) + datablock.packedSize,
      numberOfFilesArchived:
        dataset.numberOfFilesArchived + datablock.dataFileList.length,
    });
    return datablock;
  }

  // GET /datasets/:id/datablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetDatablockRead, DatasetClass),
  )
  @Get("/:pid/datablocks")
  @ApiOperation({
    summary: "It returns all the datablock for the dataset specified.",
    description:
      "It returns all the datablocks for the dataset specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to retrieve all the datablocks",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Datablock,
    isArray: true,
    description:
      "Array with all the datablocks associated with the dataset with the pid specified",
  })
  async findAllDatablocks(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<Datablock[]> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetDatablockRead,
    );

    return this.datablocksService.findAll({ where: { datasetId: pid } });
  }

  // GET /datasets/:id/datablocks/count
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetDatablockRead, DatasetClass),
  )
  @Get("/:pid/datablocks/count")
  @ApiOperation({
    summary:
      "It returns the count of all the datablock for the dataset specified.",
    description:
      "It returns the count of all the datablocks for the dataset specified by the pid passed.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to retrieve all the datablocks",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    isArray: true,
    description:
      "Return the number of datablocks for the pid in the following format: { count: integer }",
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
  async countDatablocks(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<CountApiResponse> {
    await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetDatablockRead,
    );
    return this.datablocksService.count({ where: { datasetId: pid } });
  }

  // PATCH /datasets/:id/datablocks/:fk
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetDatablockUpdate, DatasetClass),
  )
  @UseInterceptors(
    new MultiUTCTimeInterceptor<Datablock, DataFile>("dataFileList", ["time"]),
  )
  @Patch("/:pid/datablocks/:did")
  @ApiOperation({
    summary: "It updates the datablocks specified for the dataset indicated.",
    description:
      "It updates the datablock specified by the did parameter for the dataset indicated by the pid parameter.<br>This endpoint is obsolete and it will removed in future version.<br>Datablock can be updated from the datablocks endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to update the datablocks specified",
    type: String,
  })
  @ApiParam({
    name: "did",
    description:
      "Identifier of the datablock of this dataset that we would like to patch",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: Datablock,
    isArray: false,
    description:
      "Updated values of the datablock with id specified associated with the dataset with the pid specified",
  })
  async findOneDatablockAndUpdate(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Param("did") did: string,
    @Body() updateDatablockDto: PartialUpdateDatablockDto,
  ): Promise<Datablock | null> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetDatablockUpdate,
    );
    if (!dataset) throw new NotFoundException(`dataset: ${pid} not found`);

    const datablockBeforeUpdate = await this.datablocksService.findOne({
      _id: did,
    });
    if (!datablockBeforeUpdate)
      throw new NotFoundException(`datablock: ${did} not found`);

    const datablock = (await this.datablocksService.update(
      { _id: did },
      updateDatablockDto,
    )) as Datablock;
    await this.datasetsService.findByIdAndUpdate(pid, {
      packedSize:
        (dataset.packedSize ?? 0) -
        datablockBeforeUpdate.packedSize +
        datablock.packedSize,
      numberOfFilesArchived:
        dataset.numberOfFilesArchived -
        datablockBeforeUpdate.dataFileList.length +
        datablock.dataFileList.length,
    });
    return datablock;
  }

  // DELETE /datasets/:id/datablocks/:fk
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetDatablockDelete, DatasetClass),
  )
  @Delete("/:pid/datablocks/:did")
  @ApiOperation({
    summary: "It deletes the datablock from the dataset.",
    description:
      "It deletes the datablock from the dataset.<br>This endpoint is obsolete and will be dropped in future versions.<br>Deleting datablocks will be done only from the datablocks endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to delete the datablock specified",
    type: String,
  })
  @ApiParam({
    name: "did",
    description:
      "Identifier of the datablock of this dataset that we would like to delete",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: "No value is returned",
  })
  async findOneDatablockAndRemove(
    @Req() request: Request,
    @Param("pid") pid: string,
    @Param("did") did: string,
  ): Promise<undefined> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetDatablockDelete,
    );
    if (!dataset) throw new NotFoundException(`dataset: ${pid} not found`);

    // remove datablock
    const datablock = (await this.datablocksService.remove({
      _id: did,
      datasetId: pid,
    })) as Datablock;

    if (!datablock) throw new NotFoundException(`datablock: ${did} not found`);
    // update dataset size and files number
    const updateDatasetDto: PartialUpdateDatasetObsoleteDto = {
      packedSize: (dataset.packedSize ?? 0) - datablock.packedSize,
      numberOfFilesArchived:
        dataset.numberOfFilesArchived - datablock.dataFileList.length,
    };
    await this.datasetsService.findByIdAndUpdate(dataset.pid, updateDatasetDto);
  }

  // DELETE /datasets/:id/datablocks
  @UseGuards(PoliciesGuard)
  @CheckPolicies("datasets", (ability: AppAbility) =>
    ability.can(Action.DatasetDatablockDelete, DatasetClass),
  )
  @Delete("/:pid/datablocks")
  @ApiOperation({
    summary: "It deletes all datablock from the dataset.",
    description:
      "It deletes all datablocks from the dataset.<br>This endpoint is obsolete and will be dropped in future versions.<br>Deleting datablocks will be done only from the datablocks endpoint.",
  })
  @ApiParam({
    name: "pid",
    description:
      "Persistent identifier of the dataset for which we would like to delete the datablock specified",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description:
      "Return the number of deleted datablocks in the following format: { count: integer }",
  })
  async deleteAllDatablocksFromDatasetId(
    @Req() request: Request,
    @Param("pid") pid: string,
  ): Promise<CountApiResponse> {
    const dataset = await this.checkPermissionsForDatasetExtended(
      request,
      pid,
      Action.DatasetDatablockDelete,
    );
    if (!dataset) throw new NotFoundException(`dataset: ${pid} not found`);
    // remove datablock
    const res = await this.datablocksService.removeMany({
      datasetId: pid,
    });
    // update dataset size and files number
    await this.datasetsService.findByIdAndUpdate(dataset.pid, {
      packedSize: 0,
      numberOfFilesArchived: 0,
    });
    return { count: res.deletedCount };
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
