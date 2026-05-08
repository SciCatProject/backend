import {
  Injectable,
  Inject,
  Scope,
  ForbiddenException,
  NotFoundException,
  PreconditionFailedException,
} from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { InjectModel } from "@nestjs/mongoose";
import {
  FilterQuery,
  UpdateQuery,
  Model,
  PipelineStage,
  QueryOptions,
  DeleteResult,
} from "mongoose";
import { IFacets, IFilters } from "src/common/interfaces/common.interface";
import {
  addCreatedByFields,
  addUpdatedByField,
  createFullfacetPipeline,
  createFullqueryFilter,
  parseLimitFilters,
  parseLimitFiltersForPipeline,
  parsePipelineProjection,
  parsePipelineSort,
} from "src/common/utils";
import { CreateOrigDatablockDto } from "./dto/create-origdatablock.dto";
import { PartialUpdateOrigDatablockDto } from "./dto/update-origdatablock.dto";
import {
  OutputOrigDatablockDto,
  PartialOutputOrigDatablockDto,
} from "./dto/output-origdatablock.dto";
import { IOrigDatablockFields } from "./interfaces/origdatablocks.interface";
import {
  OrigDatablock,
  OrigDatablockDocument,
} from "./schemas/origdatablock.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import {
  OrigDatablockLookupKeysEnum,
  ORIGDATABLOCK_LOOKUP_FIELDS,
} from "./types/origdatablock-lookup";
import { isEmpty } from "lodash";
import { CountApiResponse } from "src/common/types";
import { withOCCFilter } from "src/datasets/utils/occ-util";

@Injectable({ scope: Scope.REQUEST })
export class OrigDatablocksService {
  constructor(
    @InjectModel(OrigDatablock.name)
    private origDatablockModel: Model<OrigDatablockDocument>,
    @Inject(REQUEST) private request: Request,
  ) {}

  addLookupFields(
    pipeline: PipelineStage[],
    origDatablockLookupFields?: OrigDatablockLookupKeysEnum[],
  ) {
    if (origDatablockLookupFields?.includes(OrigDatablockLookupKeysEnum.all)) {
      origDatablockLookupFields = Object.keys(
        ORIGDATABLOCK_LOOKUP_FIELDS,
      ).filter(
        (field) => field !== OrigDatablockLookupKeysEnum.all,
      ) as OrigDatablockLookupKeysEnum[];
    }

    origDatablockLookupFields?.forEach((field) => {
      const fieldValue = structuredClone(ORIGDATABLOCK_LOOKUP_FIELDS[field]);

      if (fieldValue) {
        fieldValue.$lookup.as = field;

        pipeline.push(fieldValue);
      }
    });
  }

  async create(
    createOrigdatablockDto: CreateOrigDatablockDto,
  ): Promise<OrigDatablock> {
    const username = (this.request.user as JWTUser).username;
    const createdOrigDatablock = new this.origDatablockModel(
      addCreatedByFields(createOrigdatablockDto, username),
    );
    return createdOrigDatablock.save();
  }

  async findAll(
    filter: FilterQuery<OrigDatablockDocument>,
  ): Promise<OrigDatablock[]> {
    const whereFilter: FilterQuery<OrigDatablockDocument> =
      createFullqueryFilter<OrigDatablockDocument>(
        this.origDatablockModel,
        "_id",
        filter.where as FilterQuery<OrigDatablockDocument>,
      );

    const fieldsProjection: FilterQuery<OrigDatablockDocument> =
      filter.fields ?? {};
    const { limit, skip, sort } = parseLimitFilters(filter.limits);

    const origdatablockPromise = this.origDatablockModel
      .find(whereFilter, fieldsProjection)
      .limit(limit)
      .skip(skip)
      .sort(sort);

    const origdatablock = await origdatablockPromise.exec();

    return origdatablock;
  }

  async findAllComplete(
    filter: FilterQuery<OrigDatablockDocument>,
  ): Promise<PartialOutputOrigDatablockDto[]> {
    const whereFilter: FilterQuery<OrigDatablockDocument> = filter.where ?? {};
    const fieldsProjection: string[] = filter.fields ?? {};
    const limits: QueryOptions<OrigDatablockDocument> = filter.limits ?? {
      limit: 10,
      skip: 0,
      sort: { createdAt: "desc" },
    };

    const pipeline: PipelineStage[] = [{ $match: whereFilter }];
    this.addLookupFields(pipeline, filter.include);

    if (!isEmpty(fieldsProjection)) {
      const projection = parsePipelineProjection(fieldsProjection);
      pipeline.push({ $project: projection });
    }

    if (!isEmpty(limits.sort)) {
      const sort = parsePipelineSort(limits.sort);
      pipeline.push({ $sort: sort });
    }

    pipeline.push({ $skip: limits.skip || 0 });

    pipeline.push({ $limit: limits.limit || 10 });

    const data = await this.origDatablockModel
      .aggregate<PartialOutputOrigDatablockDto>(pipeline)
      .exec();

    return data;
  }

  async findAllFilesComplete(
    filter: FilterQuery<OrigDatablockDocument>,
  ): Promise<PartialOutputOrigDatablockDto[]> {
    const whereFilter: FilterQuery<OrigDatablockDocument> = filter.where ?? {};
    const fieldsProjection: string[] = filter.fields ?? {};
    const limits: QueryOptions<OrigDatablockDocument> = filter.limits ?? {
      limit: 10,
      skip: 0,
      sort: { createdAt: "desc" },
    };

    const pipeline: PipelineStage[] = [{ $match: whereFilter }];
    this.addLookupFields(pipeline, filter.include);

    if (!isEmpty(fieldsProjection)) {
      const projection = parsePipelineProjection(fieldsProjection);
      pipeline.push({ $project: projection });
    }

    pipeline.push({
      $lookup: {
        from: "Dataset",
        as: "dataset_temp",
        let: { datasetId: "$datasetId" },
        pipeline: [{ $match: { $expr: { $eq: ["$pid", "$$datasetId"] } } }],
      },
    });

    pipeline.push({
      $addFields: {
        datasetExist: { $gt: [{ $size: "$dataset_temp" }, 0] },
      },
    });

    pipeline.push({ $unset: "dataset_temp" });

    pipeline.push({ $unwind: "$dataFileList" });

    if (!isEmpty(limits.sort)) {
      const sort = parsePipelineSort(limits.sort);
      pipeline.push({ $sort: sort });
    }

    pipeline.push({ $skip: limits.skip || 0 });

    pipeline.push({ $limit: limits.limit || 10 });

    const data = await this.origDatablockModel
      .aggregate<PartialOutputOrigDatablockDto>(pipeline)
      .exec();

    return data;
  }

  async findOne(
    filter: FilterQuery<OrigDatablockDocument>,
  ): Promise<OrigDatablock | null> {
    const whereFilter: FilterQuery<OrigDatablockDocument> =
      createFullqueryFilter<OrigDatablockDocument>(
        this.origDatablockModel,
        "_id",
        filter as FilterQuery<OrigDatablockDocument>,
      );

    const origdatablock = await this.origDatablockModel.findOne(whereFilter);

    if (!origdatablock) {
      throw new ForbiddenException("Unauthorized access");
    }

    return origdatablock;
  }

  async findOneComplete(
    filter: FilterQuery<OrigDatablockDocument>,
  ): Promise<OutputOrigDatablockDto | null> {
    const whereFilter: FilterQuery<OrigDatablockDocument> = filter.where ?? {};
    const fieldsProjection: string[] = filter.fields ?? {};
    const limits: QueryOptions<OrigDatablockDocument> = filter.limits ?? {
      skip: 0,
      sort: { createdAt: "desc" },
    };

    const pipeline: PipelineStage[] = [{ $match: whereFilter }];
    if (!isEmpty(fieldsProjection)) {
      const projection = parsePipelineProjection(fieldsProjection);
      pipeline.push({ $project: projection });
    }

    if (!isEmpty(limits.sort)) {
      const sort = parsePipelineSort(limits.sort);
      pipeline.push({ $sort: sort });
    }

    pipeline.push({ $skip: limits.skip || 0 });

    this.addLookupFields(pipeline, filter.include);

    const [data] = await this.origDatablockModel
      .aggregate<OutputOrigDatablockDto | undefined>(pipeline)
      .exec();

    return data || null;
  }

  async fullquery(
    filter: IFilters<OrigDatablockDocument, IOrigDatablockFields>,
  ): Promise<OrigDatablock[] | null> {
    const filterQuery: FilterQuery<OrigDatablockDocument> =
      createFullqueryFilter<OrigDatablockDocument>(
        this.origDatablockModel,
        "_id",
        filter.fields as FilterQuery<OrigDatablockDocument>,
      );
    const modifiers: QueryOptions = parseLimitFilters(filter.limits);

    return this.origDatablockModel.find(filterQuery, null, modifiers).exec();
  }

  async fullqueryFilesList(
    filter: IFilters<OrigDatablockDocument, IOrigDatablockFields>,
  ): Promise<OrigDatablock[] | null> {
    const filterQuery: FilterQuery<OrigDatablockDocument> =
      createFullqueryFilter<OrigDatablockDocument>(
        this.origDatablockModel,
        "_id",
        filter.fields as FilterQuery<OrigDatablockDocument>,
      );
    const modifiers = parseLimitFiltersForPipeline(filter.limits);

    const pipelineStages: PipelineStage[] = [
      { $match: filterQuery },
      {
        $lookup: {
          from: "Dataset",
          as: "Dataset",
          let: { datasetId: "$datasetId" },
          pipeline: [{ $match: { $expr: { $eq: ["$pid", "$$datasetId"] } } }],
        },
      },
      {
        $addFields: {
          datasetExist: { $gt: [{ $size: "$Dataset" }, 0] },
        },
      },
      { $unset: "Dataset" },
      { $unwind: "$dataFileList" },
      ...modifiers,
    ];

    return this.origDatablockModel.aggregate(pipelineStages).exec();
  }

  async fullfacet(
    filters: IFacets<IOrigDatablockFields>,
    subField?: string,
  ): Promise<Record<string, unknown>[]> {
    const fields = filters.fields ?? {};
    const facets = filters.facets ?? [];
    const pipeline = createFullfacetPipeline<
      OrigDatablockDocument,
      FilterQuery<OrigDatablockDocument>
    >(this.origDatablockModel, "datasetId", fields, facets, subField);

    return this.origDatablockModel.aggregate(pipeline).exec();
  }

  async update(
    filter: FilterQuery<OrigDatablockDocument>,
    updateOrigdatablockDto: PartialUpdateOrigDatablockDto,
  ): Promise<OrigDatablock | null> {
    const username = (this.request.user as JWTUser).username;
    return this.origDatablockModel
      .findOneAndUpdate(
        filter,
        addUpdatedByField(updateOrigdatablockDto, username),
        { new: true },
      )
      .exec();
  }

  async remove(filter: FilterQuery<OrigDatablockDocument>): Promise<unknown> {
    return this.origDatablockModel.findOneAndDelete(filter).exec();
  }

  async removeMany(
    filter: FilterQuery<OrigDatablockDocument>,
  ): Promise<DeleteResult> {
    return this.origDatablockModel.deleteMany(filter).exec();
  }

  async findByIdAndUpdate(
    id: string,
    updateDatasetDto: PartialUpdateOrigDatablockDto,
    unmodifiedSince?: Date,
  ): Promise<OrigDatablock | null> {
    const username = (this.request.user as JWTUser).username;
    let filter: FilterQuery<OrigDatablockDocument> = { _id: id };
    filter = withOCCFilter(filter, unmodifiedSince);
    const patchedOrigDatablock = await this.origDatablockModel
      .findOneAndUpdate(
        filter,
        addUpdatedByField(
          updateDatasetDto as UpdateQuery<OrigDatablockDocument>,
          username,
        ),
        { new: true },
      )
      .exec();
    if (!patchedOrigDatablock) {
      if (!unmodifiedSince) {
        throw new NotFoundException(`OrigDatablock #${id} not found`);
      }
      throw new PreconditionFailedException(
        `OrigDatablock #${id} has been modified on server since ${unmodifiedSince.toUTCString()}`,
      );
    }
    return patchedOrigDatablock;
  }

  async findByIdAndDelete(id: string): Promise<OutputOrigDatablockDto | null> {
    return await this.origDatablockModel.findOneAndDelete({ _id: id });
  }

  async count(
    filter: IFilters<OrigDatablockDocument>,
  ): Promise<CountApiResponse> {
    const whereFilter = filter.where ?? {};
    const count = await this.origDatablockModel
      .countDocuments(whereFilter)
      .exec();
    return { count };
  }

  async aggregateSizeAndFileCount(
    datasetId: string,
  ): Promise<{ size: number; numberOfFiles: number }> {
    const [result] = await this.origDatablockModel
      .aggregate<{ size: number; numberOfFiles: number }>([
        { $match: { datasetId } },
        {
          $group: {
            _id: null,
            size: { $sum: "$size" },
            numberOfFiles: { $sum: { $size: "$dataFileList" } },
          },
        },
      ])
      .exec();
    return result
      ? { size: result.size, numberOfFiles: result.numberOfFiles }
      : { size: 0, numberOfFiles: 0 };
  }
}
