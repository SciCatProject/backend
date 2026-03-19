import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
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
  IDatasetOpenSearchPipeline,
  IDatasetRelation,
  IDatasetScopes,
} from "./interfaces/dataset-filters.interface";
import { DatasetClass, DatasetDocument } from "./schemas/dataset.schema";
import {
  DATASET_LOOKUP_FIELDS,
  DatasetLookupKeysEnum,
} from "./types/dataset-lookup";
import { ProposalsService } from "src/proposals/proposals.service";
import {
  MetadataKeysService,
  MetadataSourceDoc,
} from "src/metadata-keys/metadatakeys.service";
import { OpensearchService } from "src/opensearch/opensearch.service";
import {
  DATASET_OPENSEARCH_EXCLUDE_FIELDS_QUERY,
  sanitizeDatasetForOpensearch,
} from "./utils/dataset-opensearch.utils";
import type { IndexSettings } from "@opensearch-project/opensearch/api/_types/indices._common";
import type { TypeMapping } from "@opensearch-project/opensearch/api/_types/_common.mapping";
import { BulkStats } from "@opensearch-project/opensearch/lib/Helpers";

@Injectable({ scope: Scope.REQUEST })
export class DatasetsService {
  private readonly osDefaultIndex: string;
  private readonly isOsEnabled: boolean;
  private readonly osSyncBatchSize: number;

  constructor(
    private configService: ConfigService,
    @InjectModel(DatasetClass.name)
    private datasetModel: Model<DatasetDocument>,
    @Inject(REQUEST) private request: Request,

    private datasetsAccessService: DatasetsAccessService,
    @Optional() private opensearchService: OpensearchService,
    private metadataKeysService: MetadataKeysService,
    private proposalService: ProposalsService,
  ) {
    this.osDefaultIndex =
      this.configService.get<string>("opensearch.defaultIndex") || "dataset";
    this.isOsEnabled =
      this.configService.get<string>("opensearch.enabled") === "yes" || false;
    this.osSyncBatchSize =
      this.configService.get<number>("opensearch.dataSyncBatchSize") || 10000;
  }

  private createMetadataKeysInstance(
    doc: UpdateQuery<DatasetDocument>,
  ): MetadataSourceDoc {
    const source: MetadataSourceDoc = {
      sourceType: "dataset",
      sourceId: doc.pid,
      ownerGroup: doc.owner,
      accessGroups: doc.accessGroups || [],
      isPublished: doc.isPublished || false,
      metadata: doc.scientificMetadata ?? {},
    };
    return source;
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

    const savedDataset = await createdDataset.save();

    if (this.opensearchService && createdDataset) {
      await this.opensearchService.updateInsertDocument(
        sanitizeDatasetForOpensearch<DatasetDocument>(savedDataset.toObject()),
      );
    }

    if (savedDataset.proposalIds && savedDataset.proposalIds.length > 0) {
      await this.proposalService.incrementNumberOfDatasets(
        savedDataset.proposalIds,
      );
    }

    this.metadataKeysService.insertManyFromSource(
      this.createMetadataKeysInstance(savedDataset),
    );

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

    const datasets = await this.datasetModel
      .find(whereClause, null, modifiers)
      .exec();

    return datasets;
  }

  async opensearchQuery(
    filter: IFilters<DatasetDocument, IDatasetFields>,
  ): Promise<DatasetDocument[] | null> {
    if (
      !this.isOsEnabled ||
      !filter.fields?.text ||
      !this.opensearchService.connected() ||
      !(await this.opensearchService.isPopulated())
    ) {
      return this.fullquery(filter);
    }

    const { text, isPublished, userGroups } = filter.fields || {};

    const mongoQuery: FilterQuery<DatasetDocument> =
      createFullqueryFilter<DatasetDocument>(
        this.datasetModel,
        "pid",
        filter.fields as FilterQuery<DatasetDocument>,
      );

    const modifiers: QueryOptions = parseLimitFilters(filter.limits);

    delete mongoQuery.$text;

    const osResult = await this.opensearchService.search(
      { text, userGroups, isPublished },
      this.osDefaultIndex,
      modifiers.limit,
      modifiers.skip,
    );
    const datasets = await this.datasetModel
      .find({ pid: { $in: osResult.data }, ...mongoQuery })
      .sort(modifiers.sort)
      .exec();

    return datasets;
  }

  async fullFacet(
    filters: IFacets<IDatasetFields>,
  ): Promise<Record<string, unknown>[]> {
    const fields = filters.fields ?? {};
    const facets = filters.facets ?? [];

    const pipeline = createFullfacetPipeline<DatasetDocument, IDatasetFields>(
      this.datasetModel,
      "pid",
      fields,
      facets,
      "",
    );

    return await this.datasetModel.aggregate(pipeline).exec();
  }

  async opensearchFacet(
    filters: IFacets<IDatasetFields>,
  ): Promise<Record<string, unknown>[]> {
    const osConfig =
      this.configService.get<{
        settings: IndexSettings;
        mappings: TypeMapping;
      }>("opensearchConfig") || null;
    const osMaxResultWindow = Number(
      osConfig?.settings?.index?.max_result_window,
    );

    if (
      !this.isOsEnabled ||
      !filters.fields?.text ||
      !this.opensearchService.connected() ||
      !(await this.opensearchService.isPopulated())
    ) {
      return this.fullFacet(filters);
    }
    const fields = filters.fields ?? {};
    const facets = filters.facets ?? [];

    const osResult = await this.opensearchService.search(
      {
        text: fields.text,
        userGroups: fields.userGroups,
        isPublished: fields.isPublished,
      },
      this.osDefaultIndex,
      osMaxResultWindow,
    );

    fields.openSearchIdList = osResult.data;
    delete fields.text;
    const pipeline = createFullfacetPipeline<
      DatasetDocument,
      IDatasetOpenSearchPipeline
    >(this.datasetModel, "pid", fields, facets, "");

    return await this.datasetModel.aggregate(pipeline).exec();
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
    count = await this.datasetModel.countDocuments(whereFilter).exec();

    return { count };
  }

  // PUT dataset
  // we update the full dataset if exist or create a new one if it does not
  async findByIdAndReplace(
    id: string,
    updateDatasetDto: UpdateDatasetDto,
  ): Promise<DatasetDocument | null> {
    const username = (this.request.user as JWTUser).username;
    const existingDataset = await this.datasetModel.findOne({ pid: id }).exec();

    if (!existingDataset) {
      throw new NotFoundException(`Dataset #${id} not found`);
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

    if (this.opensearchService) {
      await this.opensearchService.updateInsertDocument(
        sanitizeDatasetForOpensearch<DatasetDocument>(
          updatedDataset.toObject(),
        ),
      );
    }

    await this.metadataKeysService.replaceManyFromSource(
      this.createMetadataKeysInstance(updatedDataset),
    );
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

    // check if we were able to find the dataset and update it
    if (!patchedDataset) {
      throw new NotFoundException(`Dataset #${id} not found`);
    }

    if (this.opensearchService) {
      await this.opensearchService.updateInsertDocument(
        sanitizeDatasetForOpensearch<DatasetDocument>(
          patchedDataset.toObject(),
        ),
      );
    }

    await this.metadataKeysService.replaceManyFromSource(
      this.createMetadataKeysInstance(patchedDataset),
    );
    // we were able to find the dataset and update it
    return patchedDataset;
  }

  // DELETE dataset
  async findByIdAndDelete(id: string): Promise<DatasetDocument | null> {
    const deletedDataset = await this.datasetModel
      .findOneAndDelete({
        pid: id,
      })
      .exec();

    if (!deletedDataset) {
      throw new NotFoundException(`Dataset #${id} not found`);
    }

    if (this.opensearchService) {
      await this.opensearchService.deleteDocument(id);
    }

    if (deletedDataset?.proposalIds && deletedDataset.proposalIds.length > 0) {
      await this.proposalService.decrementNumberOfDatasets(
        deletedDataset.proposalIds,
      );
    }

    // delete metadata keys associated with this dataset
    await this.metadataKeysService.deleteMany({
      sourceId: id,
      sourceType: "dataset",
    });

    return deletedDataset;
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

  async syncDatasetsToOpensearch(index: string) {
    try {
      await this.opensearchService.checkIndexExists(index);

      let lastId: string | null = null;
      const bulkOperationFinalResult: BulkStats = {
        total: 0,
        failed: 0,
        retry: 0,
        successful: 0,
        noop: 0,
        time: 0,
        bytes: 0,
        aborted: false,
      };

      while (true) {
        const query = lastId ? { _id: { $gt: lastId } } : {};

        const datasets: DatasetClass[] = await this.datasetModel
          .find(query, DATASET_OPENSEARCH_EXCLUDE_FIELDS_QUERY)
          .sort({ _id: 1 })
          .lean()
          .limit(this.osSyncBatchSize)
          .exec();

        if (datasets.length === 0) break;

        const bulk =
          await this.opensearchService.performBulkOperation<DatasetClass>(
            datasets,
            index,
          );

        lastId = datasets[datasets.length - 1]._id;

        // Aggregate bulk stats across batches for internal sync status tracking.
        bulkOperationFinalResult.total += bulk.total;
        bulkOperationFinalResult.failed += bulk.failed;
        bulkOperationFinalResult.retry += bulk.retry;
        bulkOperationFinalResult.successful += bulk.successful;
        bulkOperationFinalResult.noop += bulk.noop;
        bulkOperationFinalResult.time += bulk.time;
        bulkOperationFinalResult.bytes += bulk.bytes;
        bulkOperationFinalResult.aborted = bulk.aborted;

        Logger.log(
          `Synced ${bulkOperationFinalResult.total} datasets to OpenSearch`,
          "OpensearchSync",
        );
      }

      Logger.log(
        `Sync complete — total: ${bulkOperationFinalResult.total}`,
        "OpensearchSync",
      );

      return bulkOperationFinalResult;
    } catch (error) {
      throw new Error(`OpenSearch sync failed: ${error}`);
    }
  }
}
