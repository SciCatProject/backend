import { BadRequestException, Inject, Injectable, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "express";
import { FilterQuery, Model } from "mongoose";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { addCreatedByFields, parseLimitFilters } from "src/common/utils";
import { CreatePublishedDataV4Dto } from "./dto/create-published-data.v4.dto";
import { PartialUpdatePublishedDataV4Dto } from "./dto/update-published-data.v4.dto";
import {
  ICount,
  IPublishedDataFilters,
} from "./interfaces/published-data.interface";
import {
  PublishedData,
  PublishedDataDocument,
} from "./schemas/published-data.schema";
import {
  createNoResourceIdsProvidedError,
  hasAtLeastOneResourceId,
  hasOnlyNonBlankResourceIds,
  normalizeResourceIdArrays,
  RESOURCE_ID_FIELD_NAMES,
  ResourceIdFields,
} from "./pipes/resource-id.validation";

@Injectable({ scope: Scope.REQUEST })
export class PublishedDataService {
  constructor(
    @InjectModel(PublishedData.name)
    private publishedDataModel: Model<PublishedDataDocument>,
    @Inject(REQUEST)
    private request: Request,
    private configService: ConfigService,
  ) {}

  async getConfig(): Promise<Record<string, unknown> | null> {
    const config =
      this.configService.get<Record<string, unknown>>("publishedDataConfig") ||
      null;

    return config;
  }

  /**
   * Validates that at least one ID field is present and non-empty.
   * This provides defense-in-depth validation at the service level.
   *
   * @param datasetPids - Array of dataset persistent identifiers
   * @param proposalIds - Array of proposal persistent identifiers
   * @param sampleIds - Array of sample persistent identifiers
   * @param instrumentIds - Array of instrument persistent identifiers
   * @throws BadRequestException if no ID fields are provided
   */
  private validateResourceIdArrays(value: ResourceIdFields): void {
    if (!hasOnlyNonBlankResourceIds(value)) {
      throw new BadRequestException({
        message: "Resource ID arrays must contain only non-blank strings",
        code: "INVALID_RESOURCE_IDS",
      });
    }
  }

  private validateAtLeastOneIdField(
    datasetPids?: string[],
    proposalIds?: string[],
    sampleIds?: string[],
    instrumentIds?: string[],
  ): void {
    if (
      !hasAtLeastOneResourceId({
        datasetPids,
        proposalIds,
        sampleIds,
        instrumentIds,
      })
    ) {
      throw new BadRequestException(createNoResourceIdsProvidedError());
    }
  }

  async create(
    createPublishedDataDto: CreatePublishedDataV4Dto,
  ): Promise<PublishedData> {
    const normalizedDto = normalizeResourceIdArrays(createPublishedDataDto);

    // Service-level validation (defense-in-depth)
    this.validateResourceIdArrays(normalizedDto);
    this.validateAtLeastOneIdField(
      normalizedDto.datasetPids,
      normalizedDto.proposalIds,
      normalizedDto.sampleIds,
      normalizedDto.instrumentIds,
    );

    const username = (this.request.user as JWTUser).username;
    const createdPublished = new this.publishedDataModel(
      addCreatedByFields<CreatePublishedDataV4Dto>(normalizedDto, username),
    );

    return createdPublished.save();
  }

  async findAll(filter: IPublishedDataFilters): Promise<PublishedData[]> {
    const { limit, skip, sort } = parseLimitFilters(filter.limits);
    return this.publishedDataModel
      .find(filter.where ?? {})
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .select(filter.fields ?? {})
      .exec();
  }

  async countDocuments(
    filter: FilterQuery<PublishedDataDocument>,
    options?: object,
  ): Promise<ICount> {
    const count = await this.publishedDataModel
      .countDocuments(filter.where ?? {}, options)
      .exec();
    return { count };
  }

  async findOne(
    filter: FilterQuery<PublishedDataDocument>,
  ): Promise<PublishedData | null> {
    return this.publishedDataModel.findOne(filter).exec();
  }

  /**
   * Validates the resource-ID portion of a partial update against an existing
   * document. Legacy documents may be updated without resource IDs, but an
   * update that explicitly changes an ID field must leave at least one ID.
   */
  validateUpdate(
    existing: PublishedData,
    updatePublishedDataDto: PartialUpdatePublishedDataV4Dto,
  ): void {
    const normalizedDto = normalizeResourceIdArrays(updatePublishedDataDto);
    const updatesResourceIds = RESOURCE_ID_FIELD_NAMES.some(
      (field) => normalizedDto[field] !== undefined,
    );

    if (!updatesResourceIds) {
      return;
    }

    this.validateResourceIdArrays(normalizedDto);
    this.validateAtLeastOneIdField(
      normalizedDto.datasetPids ?? existing.datasetPids,
      normalizedDto.proposalIds ?? existing.proposalIds,
      normalizedDto.sampleIds ?? existing.sampleIds,
      normalizedDto.instrumentIds ?? existing.instrumentIds,
    );
  }

  private getAtomicUpdateFilter(
    filter: FilterQuery<PublishedDataDocument>,
    updatePublishedDataDto: PartialUpdatePublishedDataV4Dto,
  ): FilterQuery<PublishedDataDocument> {
    const updatesResourceIds = RESOURCE_ID_FIELD_NAMES.some(
      (field) => updatePublishedDataDto[field] !== undefined,
    );

    if (!updatesResourceIds) {
      return filter;
    }

    if (hasAtLeastOneResourceId(updatePublishedDataDto)) {
      return filter;
    }

    const unchangedResourceIdFields = RESOURCE_ID_FIELD_NAMES.filter(
      (field) => updatePublishedDataDto[field] === undefined,
    );

    if (unchangedResourceIdFields.length === 0) {
      this.validateAtLeastOneIdField(
        updatePublishedDataDto.datasetPids,
        updatePublishedDataDto.proposalIds,
        updatePublishedDataDto.sampleIds,
        updatePublishedDataDto.instrumentIds,
      );
    }

    const existingResourceIdConditions = unchangedResourceIdFields.map(
      (field) => ({
        [field]: { $elemMatch: { $regex: /\S/ } },
      }),
    );

    return {
      $and: [
        filter,
        {
          $or: existingResourceIdConditions,
        },
      ],
    };
  }

  async update(
    filter: FilterQuery<PublishedDataDocument>,
    updatePublishedDataDto: PartialUpdatePublishedDataV4Dto,
  ): Promise<PublishedData | null> {
    const normalizedDto = normalizeResourceIdArrays(updatePublishedDataDto);
    this.validateResourceIdArrays(normalizedDto);
    const username = (this.request.user as JWTUser).username;
    const atomicFilter = this.getAtomicUpdateFilter(filter, normalizedDto);

    const updated = await this.publishedDataModel
      .findOneAndUpdate(
        atomicFilter,
        {
          $set: {
            ...normalizedDto,
            updatedBy: username,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();

    if (updated) {
      return updated;
    }

    // A failed atomic predicate may indicate a concurrent update that made
    // this change invalid. Check only on the failure path to preserve the
    // existing validation error while keeping successful updates atomic.
    const existing = await this.publishedDataModel.findOne(filter).exec();
    if (existing) {
      this.validateUpdate(existing, normalizedDto);
    }

    return null;
  }

  /**
   * Remove a published data document.
   * @param filter - The filter to find the document to remove.
   * @returns The removed document or null if not found.
   */
  async remove(
    filter: FilterQuery<PublishedDataDocument>,
  ): Promise<PublishedData | null> {
    return this.publishedDataModel.findOneAndDelete(filter).exec();
  }
}
