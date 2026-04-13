import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  Scope,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "express";
import { isEmpty } from "lodash";
import {
  FilterQuery,
  Model,
  PipelineStage,
  ProjectionType,
  QueryOptions,
  RootFilterQuery,
  UpdateQuery,
} from "mongoose";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { IFacets, IFilters } from "src/common/interfaces/common.interface";
import {
  addApiVersionField,
  addCreatedByFields,
  addUpdatedByField,
  createFullfacetPipeline,
  createFullqueryFilter,
  extractMetadataKeys,
  parseLimitFilters,
  parseOrderLimits,
  parsePipelineProjection,
  parsePipelineSort,
  decodeMetadataKeyStrings,
} from "src/common/utils";
import { ElasticSearchService } from "src/elastic-search/elastic-search.service";
import { DatasetsAccessService } from "./datasets-access.service";
import { CreateDatasetDto } from "./dto/create-dataset.dto";
import {
  OutputDatasetDto,
  PartialOutputDatasetDto,
} from "./dto/output-dataset.dto";
import {
  PartialUpdateDatasetDto,
  PartialUpdateDatasetWithHistoryDto,
  UpdateDatasetDto,
} from "./dto/update-dataset.dto";
import {
  IDatasetFields,
  IDatasetFilters,
  IDatasetFiltersV4,
  IDatasetRelation,
  IDatasetScopes,
} from "./interfaces/dataset-filters.interface";
import { DatasetClass, DatasetDocument } from "./schemas/dataset.schema";
import {
  DATASET_LOOKUP_FIELDS,
  DatasetLookupKeysEnum,
} from "./types/dataset-lookup";
import { ProposalsService } from "src/proposals/proposals.service";

@Injectable({ scope: Scope.REQUEST })
export class DatasetsService {
  private ESClient: ElasticSearchService | null;
  constructor(
    private configService: ConfigService,
    @InjectModel(DatasetClass.name)
    private datasetModel: Model<DatasetDocument>,
    private datasetsAccessService: DatasetsAccessService,
    @Inject(ElasticSearchService)
    private elasticSearchService: ElasticSearchService,
    @Inject(REQUEST) private request: Request,
    private proposalService: ProposalsService,
  ) {
    if (this.elasticSearchService.connected) {
      this.ESClient = this.elasticSearchService;
    }
  }

  addLookupFields(
    pipeline: PipelineStage[],
    datasetLookupFields?: (DatasetLookupKeysEnum | IDatasetRelation)[],
    applyDefaults = true,
  ) {
    const relationsAndScopes =
      this.extractRelationsAndScopes(datasetLookupFields);

    const scopes = relationsAndScopes.scopes;
    const addedRelations: string[] = [];
    for (const field of relationsAndScopes.relations) {
      const fieldValue = structuredClone(DATASET_LOOKUP_FIELDS[field]);
      if (!fieldValue) continue;
      fieldValue.$lookup.as = field;
      const scope = scopes[field];

      if (applyDefaults)
        this.datasetsAccessService.addRelationFieldAccess(fieldValue);

      const includePipeline = [];
      if (scope?.where) includePipeline.push({ $match: scope.where });
      if (scope?.fields)
        includePipeline.push({
          $project: parsePipelineProjection(scope.fields as string[]),
        });
      if (scope?.limits?.skip)
        includePipeline.push({ $skip: scope.limits.skip });
      if (scope?.limits?.limit)
        includePipeline.push({ $limit: scope.limits.limit });

      const limits = parseOrderLimits(scope?.limits);
      if (limits?.sort) {
        const sort = parsePipelineSort(limits.sort);
        includePipeline.push({ $sort: sort });
      }

      if (includePipeline.length > 0)
        fieldValue.$lookup.pipeline = (
          fieldValue.$lookup.pipeline ?? []
        ).concat(includePipeline);

      pipeline.push(fieldValue);
      addedRelations.push(field);
    }
    return addedRelations;
  }

  private extractRelationsAndScopes(
    datasetLookupFields:
      | (DatasetLookupKeysEnum | IDatasetRelation)[]
      | undefined,
  ) {
    const scopes = {} as Record<DatasetLookupKeysEnum, IDatasetScopes>;
    const fieldsList: DatasetLookupKeysEnum[] = [];
    let isAll = false;
    datasetLookupFields?.forEach((f) => {
      if (typeof f === "object" && "relation" in f) {
        fieldsList.push(f.relation);
        scopes[f.relation] = f.scope;
        isAll = f.relation === DatasetLookupKeysEnum.all;
        return;
      }
      isAll = f === DatasetLookupKeysEnum.all;
      fieldsList.push(f);
    });

    const relations = isAll
      ? (Object.keys(DATASET_LOOKUP_FIELDS).filter(
          (field) => field !== DatasetLookupKeysEnum.all,
        ) as DatasetLookupKeysEnum[])
      : fieldsList;
    return { scopes, relations };
  }

  async create(createDatasetDto: CreateDatasetDto): Promise<DatasetDocument> {
    const username = (this.request.user as JWTUser).username;
    // Add version to the datasets based on the apiVersion extracted from the route path or use default one
    addApiVersionField(
      createDatasetDto,
      this.request.route.path || this.configService.get("versions.api"),
    );

    const createdDataset = new this.datasetModel(
      // insert created and updated fields
      addCreatedByFields(createDatasetDto, username),
    );
    if (this.ESClient && createdDataset) {
      await this.ESClient.updateInsertDocument(createdDataset.toObject());
    }

    const savedDataset = await createdDataset.save();

    if (savedDataset.proposalIds && savedDataset.proposalIds.length > 0) {
      await this.proposalService.incrementNumberOfDatasets(
        savedDataset.proposalIds,
      );
    }

    return savedDataset;
  }

  async findAll(
    filter: FilterQuery<DatasetDocument>,
  ): Promise<DatasetDocument[]> {
    const whereFilter: RootFilterQuery<DatasetDocument> = filter.where ?? {};
    const fieldsProjection: ProjectionType<DatasetDocument> =
      filter.fields ?? {};
    const { limit, skip, sort } = parseLimitFilters(filter.limits);
    const datasetPromise = this.datasetModel
      .find(whereFilter, fieldsProjection)
      .limit(limit)
      .skip(skip)
      .sort(sort);

    const datasets = await datasetPromise.exec();

    return datasets;
  }

  async findAllComplete(
    filter: IDatasetFilters<DatasetDocument, IDatasetFields>,
    applyDefaults = true,
  ): Promise<PartialOutputDatasetDto[]> {
    const whereFilter: FilterQuery<DatasetDocument> = filter.where ?? {};
    const fieldsProjection = (filter.fields ?? []) as string[];
    const filterDefaults = {
      limit: 10,
      skip: 0,
      sort: { createdAt: "desc" } as Record<string, "asc" | "desc">,
    };
    const limits = parseLimitFilters(
      applyDefaults ? { ...filterDefaults, ...filter.limits } : filter.limits,
    );

    const pipeline: PipelineStage[] = [{ $match: whereFilter }];
    const addedRelations = this.addLookupFields(
      pipeline,
      filter.include,
      applyDefaults,
    );

    if (!isEmpty(fieldsProjection)) {
      const projection = parsePipelineProjection(
        fieldsProjection,
        addedRelations,
      );
      pipeline.push({ $project: projection });
    }

    if (!isEmpty(limits.sort)) {
      const sort = parsePipelineSort(limits.sort);
      pipeline.push({ $sort: sort });
    }

    pipeline.push({ $skip: limits.skip || 0 });

    pipeline.push({ $limit: limits.limit || 10 });
    try {
      const data = await this.datasetModel
        .aggregate<PartialOutputDatasetDto>(pipeline)
        .exec();

      return data;
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("An unknown error occurred");
    }
  }

  async fullquery(
    filter: IFilters<DatasetDocument, IDatasetFields>,
    extraWhereClause: FilterQuery<DatasetDocument> = {},
  ): Promise<DatasetDocument[] | null> {
    let datasets;

    const filterQuery: FilterQuery<DatasetDocument> =
      createFullqueryFilter<DatasetDocument>(
        this.datasetModel,
        "pid",
        filter.fields as FilterQuery<DatasetDocument>,
      );

    const whereClause: FilterQuery<DatasetDocument> = {
      ...filterQuery,
      ...extraWhereClause,
    };
    const modifiers: QueryOptions = parseLimitFilters(filter.limits);

    const isFieldsEmpty = Object.keys(whereClause).length === 0;

    // NOTE: if Elastic search DB is empty we should use default mongo query
    const canPerformElasticSearchQueries = await this.isElasticSearchDBEmpty();

    if (!this.ESClient || isFieldsEmpty || !canPerformElasticSearchQueries) {
      datasets = await this.datasetModel
        .find(whereClause, null, modifiers)
        .exec();
    } else {
      const esResult = await this.ESClient.search(
        filter.fields as IDatasetFields,
        modifiers.limit,
        modifiers.skip,
        modifiers.sort,
      );

      datasets = await this.datasetModel
        .find({ pid: { $in: esResult.data } })
        .sort(modifiers.sort)
        .exec();
    }

    return datasets;
  }

  async fullFacet(
    filters: IFacets<IDatasetFields>,
  ): Promise<Record<string, unknown>[]> {
    let data;

    const fields = filters.fields ?? {};
    const facets = filters.facets ?? [];

    // NOTE: if fields contains no value, we should use mongo query to optimize performance.
    // however, fields always contain "mode" key, so we need to check if there's more than one key
    const isFieldsEmpty = Object.keys(fields).length === 1;

    // NOTE: if Elastic search DB is empty we should use default mongo query
    const canPerformElasticSearchQueries = await this.isElasticSearchDBEmpty();

    if (!this.ESClient || isFieldsEmpty || !canPerformElasticSearchQueries) {
      const pipeline = createFullfacetPipeline<DatasetDocument, IDatasetFields>(
        this.datasetModel,
        "pid",
        fields,
        facets,
        "",
      );

      data = await this.datasetModel.aggregate(pipeline).exec();
    } else {
      const facetResult = await this.ESClient.aggregate(fields);

      data = facetResult;
    }
    return data;
  }

  async updateAll(
    filter: FilterQuery<DatasetDocument>,
    updateDatasetDto: Record<string, unknown>,
  ): Promise<unknown> {
    return this.datasetModel.updateMany(filter, updateDatasetDto, {}).exec();
  }

  async findOne(
    filter: FilterQuery<DatasetDocument>,
  ): Promise<DatasetDocument | null> {
    const whereFilter: FilterQuery<DatasetDocument> = filter.where ?? {};
    const fieldsProjection: FilterQuery<DatasetDocument> = filter.fields ?? {};

    return this.datasetModel.findOne(whereFilter, fieldsProjection).exec();
  }

  async findOneComplete(
    filter: IDatasetFiltersV4<DatasetDocument, IDatasetFields>,
  ): Promise<OutputDatasetDto | null> {
    filter.limits = filter.limits ?? {
      skip: 0,
      sort: { createdAt: "desc" } as Record<
        keyof DatasetDocument,
        "asc" | "desc"
      >,
    };

    const [data] = await this.findAllComplete(filter);

    return (data as OutputDatasetDto) || null;
  }

  async count(
    filter: FilterQuery<DatasetDocument>,
  ): Promise<{ count: number }> {
    const whereFilter: RootFilterQuery<DatasetDocument> = filter.where ?? {};
    let count = 0;
    if (this.ESClient && !filter.where) {
      const totalDocCount = await this.datasetModel.countDocuments();

      const { totalCount } = await this.ESClient.search(
        whereFilter as IDatasetFields,
        totalDocCount,
      );
      count = totalCount;
    } else {
      count = await this.datasetModel.countDocuments(whereFilter).exec();
    }

    return { count };
  }

  // PUT dataset
  // we update the full dataset if exist or create a new one if it does not
  async findByIdAndReplace(
    id: string,
    updateDatasetDto: UpdateDatasetDto,
  ): Promise<DatasetDocument> {
    const username = (this.request.user as JWTUser).username;
    const existingDataset = await this.datasetModel.findOne({ pid: id }).exec();

    if (!existingDataset) {
      throw new NotFoundException();
    }
    // TODO: This might need a discussion.
    // NOTE: _id, pid and some other fields should not be touched in any case.
    const updatedDatasetInput = {
      ...updateDatasetDto,
      pid: existingDataset.pid,
      createdBy: existingDataset.createdBy,
      createdAt: existingDataset.createdAt,
    };
    const updatedDataset = await this.datasetModel
      .findOneAndReplace(
        { pid: id },
        addUpdatedByField(updatedDatasetInput, username),
        {
          new: true,
        },
      )
      .exec();

    // check if we were able to find the dataset and update it
    if (!updatedDataset) {
      throw new NotFoundException(`Dataset #${id} not found`);
    }

    if (this.ESClient && updatedDataset) {
      await this.ESClient.updateInsertDocument(updatedDataset.toObject());
    }
    // we were able to find the dataset and update it
    return updatedDataset;
  }

  // PATCH dataset
  // we update only the fields that have been modified on an existing dataset
  async findByIdAndUpdate(
    id: string,
    updateDatasetDto:
      | PartialUpdateDatasetDto
      | PartialUpdateDatasetWithHistoryDto,
  ): Promise<DatasetDocument | null> {
    const existingDataset = await this.datasetModel.findOne({ pid: id }).exec();
    // check if we were able to find the dataset
    if (!existingDataset) {
      // no luck. we need to create a new dataset
      throw new NotFoundException(`Dataset #${id} not found`);
    }

    const username = (this.request.user as JWTUser).username;

    // NOTE: When doing findByIdAndUpdate in mongoose it does reset the subdocuments to default values if no value is provided
    // https://stackoverflow.com/questions/57324321/mongoose-overwriting-data-in-mongodb-with-default-values-in-subdocuments
    const patchedDataset = await this.datasetModel
      .findOneAndUpdate(
        { pid: id },
        addUpdatedByField(
          updateDatasetDto as UpdateQuery<DatasetDocument>,
          username,
        ),
        { new: true },
      )
      .exec();

    if (this.ESClient && patchedDataset) {
      await this.ESClient.updateInsertDocument(patchedDataset.toObject());
    }
    // we were able to find the dataset and update it
    return patchedDataset;
  }

  // DELETE dataset
  async findByIdAndDelete(id: string): Promise<DatasetDocument | null> {
    if (this.ESClient) {
      await this.ESClient.deleteDocument(id);
    }
    const deletedDataset = await this.datasetModel.findOneAndDelete({
      pid: id,
    });

    if (deletedDataset?.proposalIds && deletedDataset.proposalIds.length > 0) {
      await this.proposalService.decrementNumberOfDatasets(
        deletedDataset.proposalIds,
      );
    }
    return deletedDataset;
  }
  // GET datasets without _id which is used for elastic search data synchronization
  async getDatasetsWithoutId(): Promise<DatasetClass[]> {
    try {
      const datasets = this.datasetModel.find({}, { _id: 0 }).lean().exec();
      return datasets;
    } catch (error) {
      throw new NotFoundException(error);
    }
  }

  // Get metadata keys
  async metadataKeys(
    filters: IFilters<DatasetDocument, IDatasetFields>,
  ): Promise<string[]> {
    const blacklist = [
      new RegExp(".*_date"),
      new RegExp("runNumber"),
      new RegExp("Entrych*."),
      new RegExp("entryCh*."),
      new RegExp("FMC-PICO*."),
      new RegExp("BW_measurement*."),
      new RegExp("Linearity_measurement*."),
      new RegExp("Pulse_measurement*."),
    ];

    // ensure that no more than MAXLIMIT someCollections are read for metadata key extraction
    let MAXLIMIT;
    if (this.configService.get<number>("metadataParentInstancesReturnLimit")) {
      MAXLIMIT = this.configService.get<number>(
        "metadataParentInstancesReturnLimit",
      );

      let lm;

      if (filters.limits) {
        lm = JSON.parse(JSON.stringify(filters.limits));
      } else {
        lm = {};
      }

      if (MAXLIMIT && lm.limit) {
        if (lm.limit > MAXLIMIT) {
          lm.limit = MAXLIMIT;
        }
      } else {
        lm.limit = MAXLIMIT;
      }
      filters.limits = lm;
    }

    const datasets = await this.fullquery(filters);

    const metadataKeys = extractMetadataKeys<DatasetClass>(
      datasets as unknown as DatasetClass[],
      "scientificMetadata",
    ).filter((key) => !blacklist.some((regex) => regex.test(key)));

    const metadataKey = filters.fields ? filters.fields.metadataKey : undefined;
    const returnLimit = this.configService.get<number>(
      "metadataKeysReturnLimit",
    );

    const decodedKeys = decodeMetadataKeyStrings(metadataKeys);

    if (metadataKey && metadataKey.length > 0) {
      const filterKey = metadataKey.toLowerCase();
      return decodedKeys
        .filter((key) => key.toLowerCase().includes(filterKey))
        .slice(0, returnLimit);
    } else {
      return decodedKeys.slice(0, returnLimit);
    }
  }

  async isElasticSearchDBEmpty() {
    if (!this.ESClient) return;
    const count = await this.ESClient.getCount();
    return count.count > 0;
  }
}
