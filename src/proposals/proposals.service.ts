import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, PipelineStage, QueryOptions } from "mongoose";
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

@Injectable({ scope: Scope.REQUEST })
export class ProposalsService {
  constructor(
    @InjectModel(ProposalClass.name)
    private proposalModel: Model<ProposalDocument>,
    @Inject(REQUEST) private request: Request,
  ) {}

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
    return createdProposal.save();
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

    // Use findOneAndUpdate instead of manually updating the document
    // This ensures the history plugin middleware is triggered
    return this.proposalModel
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
  }

  async remove(filter: FilterQuery<ProposalDocument>): Promise<unknown> {
    return this.proposalModel.findOneAndDelete(filter).exec();
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
