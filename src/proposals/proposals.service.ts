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
import {
  FilterQuery,
  Model,
  PipelineStage,
  QueryOptions,
  UpdateQuery,
} from "mongoose";
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
import { CreateProposalDto } from "./dto/create-proposal.dto";
import { PartialUpdateProposalDto } from "./dto/update-proposal.dto";
import { IProposalFields } from "./interfaces/proposal-filters.interface";
import { ProposalClass, ProposalDocument } from "./schemas/proposal.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { CreateMeasurementPeriodDto } from "./dto/create-measurement-period.dto";
import {
  MetadataKeysService,
  MetadataSourceDoc,
} from "src/metadata-keys/metadatakeys.service";
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
      | (ProposalLookupKeysEnum | IProposalRelation)[]
      | undefined,
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

  private createMetadataKeysInstance(
    doc: UpdateQuery<ProposalDocument>,
  ): MetadataSourceDoc {
    const source: MetadataSourceDoc = {
      sourceType: "proposal",
      sourceId: doc.proposalId,
      ownerGroup: doc.ownerGroup,
      accessGroups: doc.accessGroups || [],
      isPublished: doc.isPublished || false,
      metadata: doc.metadata ?? {},
    };
    return source;
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

    this.metadataKeysService.insertManyFromSource(
      this.createMetadataKeysInstance(savedProposal),
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
      this.createMetadataKeysInstance(updatedProposal),
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

    this.metadataKeysService.deleteMany({
      sourceType: "proposal",
      sourceId: deletedProposal.proposalId,
    });

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
}
