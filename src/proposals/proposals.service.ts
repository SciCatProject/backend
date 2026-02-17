import { Inject, Injectable, NotFoundException, Scope } from "@nestjs/common";
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
  addCreatedByFields,
  addUpdatedByField,
} from "src/common/utils";
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

@Injectable({ scope: Scope.REQUEST })
export class ProposalsService {
  constructor(
    @InjectModel(ProposalClass.name)
    private proposalModel: Model<ProposalDocument>,
    private metadataKeysService: MetadataKeysService,
    @Inject(REQUEST) private request: Request,
  ) {}

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

  async update(
    filter: FilterQuery<ProposalDocument>,
    updateProposalDto: PartialUpdateProposalDto,
  ): Promise<ProposalClass | null> {
    const username = (this.request.user as JWTUser).username;

    const updatedProposal = await this.proposalModel
      .findOneAndUpdate(
        filter,
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
      throw new NotFoundException(
        `Proposal not found with filter: ${JSON.stringify(filter)}`,
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
