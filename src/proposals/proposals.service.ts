import {
  Inject,
  Injectable,
  NotFoundException,
  PreconditionFailedException,
  BadRequestException,
  Scope,
} from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, PipelineStage, QueryOptions } from "mongoose";
import { IFacets, IFilters } from "src/common/interfaces/common.interface";
import {
  createFullfacetPipeline,
  createFullqueryFilter,
  parseLimitFilters,
  parseOrderLimits,
  parsePipelineProjection,
  parsePipelineSort,
  addCreatedByFields,
  addUpdatedByField,
  createMetadataKeysInstance,
} from "src/common/utils";
import { isEmpty } from "lodash";
import {
  IProposalFilters,
  IProposalRelation,
  IProposalScopes,
} from "./interfaces/proposal-relations.interface";
import {
  PROPOSAL_LOOKUP_FIELDS,
  ProposalLookupKeysEnum,
} from "./types/proposal-lookup";
import {
  ProposalLookupKeysEnumV4,
  PROPOSAL_LOOKUP_FIELDS_V4,
} from "./types/proposal-lookup.v4";
import { IProposalFiltersV4 } from "./interfaces/proposal-filters.v4.interface";
import { IProposalFieldsV4 } from "./interfaces/proposal-fields.v4.interface";
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { CreateProposalV4Dto } from "./dto/create-proposal.v4.dto";
import { PartialUpdateProposalDto } from "./dto/update-proposal.dto";
import {
  PartialUpdateProposalV4Dto,
  UpdateProposalV4Dto,
} from "./dto/update-proposal.v4.dto";
import { IProposalFields } from "./interfaces/proposal-filters.interface";
import { ProposalClass, ProposalDocument } from "./schemas/proposal.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { CreateMeasurementPeriodDto } from "./dto/create-measurement-period.dto";
import { MetadataKeysService } from "src/metadata-keys/metadatakeys.service";
import { withOCCFilter } from "src/datasets/utils/occ-util";

@Injectable({ scope: Scope.REQUEST })
export class ProposalsService {
  constructor(
    @InjectModel(ProposalClass.name)
    private proposalModel: Model<ProposalDocument>,
    private metadataKeysService: MetadataKeysService,
    @Inject(REQUEST) private request: Request,
  ) {}

  private extractRelationsAndScopes(
    proposalLookupFields:
      (ProposalLookupKeysEnum | IProposalRelation)[] | undefined,
  ) {
    const scopes = {} as Record<ProposalLookupKeysEnum, IProposalScopes>;
    const fieldsList: ProposalLookupKeysEnum[] = [];
    let isAll = false;
    proposalLookupFields?.forEach((f) => {
      if (typeof f === "object" && "relation" in f) {
        fieldsList.push(f.relation);
        scopes[f.relation] = f.scope;
        isAll = f.relation === ProposalLookupKeysEnum.all;
        return;
      }
      isAll = f === ProposalLookupKeysEnum.all;
      fieldsList.push(f);
    });

    const relations = isAll
      ? (Object.keys(PROPOSAL_LOOKUP_FIELDS).filter(
          (field) => field !== ProposalLookupKeysEnum.all,
        ) as ProposalLookupKeysEnum[])
      : fieldsList;
    return { scopes, relations };
  }

  addLookupFields(
    pipeline: PipelineStage[],
    proposalLookupFields?: (ProposalLookupKeysEnum | IProposalRelation)[],
  ) {
    const relationsAndScopes =
      this.extractRelationsAndScopes(proposalLookupFields);

    const scopes = relationsAndScopes.scopes;
    const addedRelations: string[] = [];
    for (const field of relationsAndScopes.relations) {
      const fieldValue = structuredClone(PROPOSAL_LOOKUP_FIELDS[field]);
      if (!fieldValue) continue;
      fieldValue.$lookup.as = field;
      const scope = scopes[field];

      const includePipeline = [];
      if (scope?.where) includePipeline.push({ $match: scope.where });
      if (scope?.fields)
        includePipeline.push({
          $project: parsePipelineProjection(
            scope.fields as unknown as string[],
          ),
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

  async findAllComplete(
    filter: IProposalFilters<ProposalDocument, IProposalFields>,
  ): Promise<ProposalClass[]> {
    const whereFilter: FilterQuery<ProposalDocument> = filter.where ?? {};
    const fieldsProjection = (filter.fields ?? []) as string[];
    const filterDefaults = {
      limit: 10,
      skip: 0,
      sort: { createdAt: "desc" } as Record<string, "asc" | "desc">,
    };
    const limits = parseLimitFilters({
      ...filterDefaults,
      ...filter.limits,
    });

    const pipeline: PipelineStage[] = [{ $match: whereFilter }];
    const addedRelations = this.addLookupFields(
      pipeline,
      filter.include as (ProposalLookupKeysEnum | IProposalRelation)[],
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
      return await this.proposalModel.aggregate<ProposalClass>(pipeline).exec();
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("An unknown error occurred");
    }
  }

  async create(createProposalDto: CreateProposalDto): Promise<ProposalClass> {
    const username = (this.request.user as JWTUser).username;
    if (createProposalDto.MeasurementPeriodList) {
      for (const i in createProposalDto.MeasurementPeriodList) {
        createProposalDto.MeasurementPeriodList[i] =
          addCreatedByFields<CreateMeasurementPeriodDto>(
            createProposalDto.MeasurementPeriodList[i],
            username,
          );
      }
    }
    const createdProposal = new this.proposalModel(
      addCreatedByFields<CreateProposalDto>(createProposalDto, username),
    );
    const savedProposal = await createdProposal.save();

    await this.metadataKeysService.insertManyFromSource(
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        savedProposal,
      ),
    );
    return savedProposal;
  }

  async findAll(
    filter: IFilters<ProposalDocument, IProposalFields>,
  ): Promise<ProposalClass[]> {
    const whereFilter: FilterQuery<ProposalDocument> = filter.where ?? {};
    const { limit, skip, sort } = parseLimitFilters(filter.limits);

    return this.proposalModel
      .find(whereFilter)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .exec();
  }

  async count(
    filter: IFilters<ProposalDocument, IProposalFields>,
  ): Promise<{ count: number }> {
    const filterQuery: FilterQuery<ProposalDocument> =
      createFullqueryFilter<ProposalDocument>(
        this.proposalModel,
        "proposalId",
        filter.fields,
      );
    let countFilter = { ...filterQuery };

    // NOTE: This is fix for the related proposals count.
    // Maybe the total count should be refactored and be part of the fullquery or another separate endpoint that includes both data and the totalCount instead of making multiple requests.
    if (filter.where) {
      countFilter = { $and: [{ ...countFilter }, filter.where] };
    }

    const count = await this.proposalModel.countDocuments(countFilter).exec();

    return { count };
  }

  async fullquery(
    filter: IFilters<ProposalDocument, IProposalFields>,
  ): Promise<ProposalClass[]> {
    const filterQuery: FilterQuery<ProposalDocument> =
      createFullqueryFilter<ProposalDocument>(
        this.proposalModel,
        "proposalId",
        filter.fields,
      );
    const modifiers: QueryOptions = parseLimitFilters(filter.limits);

    return this.proposalModel.find(filterQuery, null, modifiers).exec();
  }

  async fullfacet(
    filters: IFacets<IProposalFields>,
  ): Promise<Record<string, unknown>[]> {
    const fields = filters.fields ?? {};
    const facets = filters.facets ?? [];

    const pipeline: PipelineStage[] = createFullfacetPipeline<
      ProposalDocument,
      IProposalFields
    >(this.proposalModel, "proposalId", fields, facets);

    return await this.proposalModel.aggregate(pipeline).exec();
  }

  async findOne(
    filter: FilterQuery<ProposalDocument>,
  ): Promise<ProposalClass | null> {
    return this.proposalModel.findOne(filter).exec();
  }

  async findOneAndUpdate(
    filter: FilterQuery<ProposalDocument>,
    updateProposalDto: PartialUpdateProposalDto,
    unmodifiedSince?: Date,
  ): Promise<ProposalClass | null> {
    const username = (this.request.user as JWTUser).username;
    const existingProposal = await this.proposalModel.findOne(filter).exec();

    if (!existingProposal) {
      throw new NotFoundException(
        `Proposal not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    const filterQuery = withOCCFilter(filter, unmodifiedSince);

    const updatedProposal = await this.proposalModel
      .findOneAndUpdate(
        filterQuery,
        {
          $set: {
            ...addUpdatedByField(updateProposalDto, username),
          },
        },
        {
          new: true, // Return the modified document
          runValidators: true, // Run validators on update
        },
      )
      .exec();

    if (!updatedProposal) {
      if (!unmodifiedSince) {
        throw new NotFoundException(
          `Proposal not found with filter: ${JSON.stringify(filter)}`,
        );
      }
      throw new PreconditionFailedException(
        `Proposal ${filter.proposalId} has been modified on server since ${unmodifiedSince.toISOString()}`,
      );
    }

    await this.metadataKeysService.replaceManyFromSource(
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        existingProposal,
      ),
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        updatedProposal,
      ),
    );

    return updatedProposal;
  }

  async remove(filter: FilterQuery<ProposalDocument>): Promise<unknown> {
    const deletedProposal = await this.proposalModel
      .findOneAndDelete(filter)
      .exec();

    if (!deletedProposal) {
      throw new NotFoundException(
        `Proposal not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    await this.metadataKeysService.deleteMany(
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        deletedProposal,
      ),
    );

    return deletedProposal;
  }

  async incrementNumberOfDatasets(proposalIds: string[]) {
    await this.proposalModel.updateMany(
      { proposalId: { $in: proposalIds } },
      { $inc: { numberOfDatasets: 1 } },
    );
  }

  async decrementNumberOfDatasets(proposalIds: string[]) {
    await this.proposalModel.updateMany(
      { proposalId: { $in: proposalIds } },
      { $inc: { numberOfDatasets: -1 } },
    );
  }

  // V4 specific methods

  private extractRelationsAndScopesV4(
    proposalLookupFields: ProposalLookupKeysEnumV4[] | undefined,
  ) {
    const fieldsList: ProposalLookupKeysEnumV4[] = [];
    let isAll = false;
    proposalLookupFields?.forEach((f) => {
      isAll = f === ProposalLookupKeysEnumV4.all;
      fieldsList.push(f);
    });

    const relations = isAll
      ? (Object.keys(PROPOSAL_LOOKUP_FIELDS_V4).filter(
          (field) => field !== ProposalLookupKeysEnumV4.all,
        ) as ProposalLookupKeysEnumV4[])
      : fieldsList;
    return { relations };
  }

  addLookupFieldsV4(
    pipeline: PipelineStage[],
    proposalLookupFields?: ProposalLookupKeysEnumV4[],
  ): string[] {
    const { relations } = this.extractRelationsAndScopesV4(proposalLookupFields);

    const addedRelations: string[] = [];
    for (const field of relations) {
      const fieldValue = structuredClone(PROPOSAL_LOOKUP_FIELDS_V4[field]);
      if (!fieldValue) continue;
      fieldValue.$lookup.as = field;

      pipeline.push(fieldValue);
      addedRelations.push(field);
    }
    return addedRelations;
  }

  async findAllCompleteV4(
    filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4>,
  ): Promise<ProposalClass[]> {
    const whereFilter: FilterQuery<ProposalDocument> = filter.where ?? {};
    const fieldsProjection = (filter.fields ?? []) as string[];
    const filterDefaults = {
      limit: 10,
      skip: 0,
      sort: { createdAt: "desc" } as Record<string, "asc" | "desc">,
    };
    const limits = parseLimitFilters({
      ...filterDefaults,
      ...filter.limits,
    });

    const pipeline: PipelineStage[] = [{ $match: whereFilter }];
    const addedRelations = this.addLookupFieldsV4(
      pipeline,
      filter.include as ProposalLookupKeysEnumV4[],
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
      return await this.proposalModel.aggregate<ProposalClass>(pipeline).exec();
    } catch (error) {
      if (error instanceof Error) {
        throw new BadRequestException(error.message);
      }
      throw new BadRequestException("An unknown error occurred");
    }
  }

  async findOneCompleteV4(
    filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4>,
  ): Promise<ProposalClass | null> {
    filter.limits = filter.limits ?? {
      skip: 0,
      sort: { createdAt: "desc" } as Record<
        keyof ProposalDocument,
        "asc" | "desc"
      >,
    };

    const [data] = await this.findAllCompleteV4(filter);

    return data || null;
  }

  async countV4(
    filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4>,
  ): Promise<{ count: number }> {
    const whereFilter: FilterQuery<ProposalDocument> = filter.where ?? {};

    const count = await this.proposalModel.countDocuments(whereFilter).exec();

    return { count };
  }

  async fullfacetV4(
    filters: IFacets<IProposalFieldsV4>,
  ): Promise<Record<string, unknown>[]> {
    const fields = filters.fields ?? {};
    const facets = filters.facets ?? [];

    const pipeline: PipelineStage[] = createFullfacetPipeline<
      ProposalDocument,
      IProposalFieldsV4
    >(this.proposalModel, "proposalId", fields, facets);

    return await this.proposalModel.aggregate(pipeline).exec();
  }

  async findOneAndReplace(
    filter: FilterQuery<ProposalDocument>,
    updateProposalDto: UpdateProposalV4Dto,
  ): Promise<ProposalClass | null> {
    const username = (this.request.user as JWTUser).username;
    const existingProposal = await this.proposalModel.findOne(filter).exec();

    if (!existingProposal) {
      throw new NotFoundException(
        `Proposal not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    const updatedProposal = await this.proposalModel
      .findOneAndReplace(
        filter,
        addUpdatedByField(updateProposalDto, username),
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedProposal) {
      throw new NotFoundException(
        `Proposal not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    await this.metadataKeysService.replaceManyFromSource(
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        existingProposal,
      ),
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        updatedProposal,
      ),
    );

    return updatedProposal;
  }

  async createV4(createProposalDto: CreateProposalV4Dto): Promise<ProposalClass> {
    const username = (this.request.user as JWTUser).username;
    if (createProposalDto.MeasurementPeriodList) {
      for (const i in createProposalDto.MeasurementPeriodList) {
        createProposalDto.MeasurementPeriodList[i] =
          addCreatedByFields<CreateMeasurementPeriodDto>(
            createProposalDto.MeasurementPeriodList[i],
            username,
          );
      }
    }
    const createdProposal = new this.proposalModel(
      addCreatedByFields<CreateProposalV4Dto>(createProposalDto, username),
    );
    const savedProposal = await createdProposal.save();

    await this.metadataKeysService.insertManyFromSource(
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        savedProposal,
      ),
    );
    return savedProposal;
  }

  async findOneAndUpdateV4(
    filter: FilterQuery<ProposalDocument>,
    updateProposalDto: PartialUpdateProposalV4Dto,
    unmodifiedSince?: Date,
  ): Promise<ProposalClass | null> {
    const username = (this.request.user as JWTUser).username;
    const existingProposal = await this.proposalModel.findOne(filter).exec();

    if (!existingProposal) {
      throw new NotFoundException(
        `Proposal not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    const filterQuery = withOCCFilter(filter, unmodifiedSince);

    const updatedProposal = await this.proposalModel
      .findOneAndUpdate(
        filterQuery,
        {
          $set: {
            ...addUpdatedByField(updateProposalDto, username),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (!updatedProposal) {
      if (!unmodifiedSince) {
        throw new NotFoundException(
          `Proposal not found with filter: ${JSON.stringify(filter)}`,
        );
      }
      throw new PreconditionFailedException(
        `Proposal ${filter.proposalId} has been modified on server since ${unmodifiedSince.toISOString()}`,
      );
    }

    await this.metadataKeysService.replaceManyFromSource(
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        existingProposal,
      ),
      createMetadataKeysInstance(
        this.proposalModel.collection.name,
        updatedProposal,
      ),
    );

    return updatedProposal;
  }
}
