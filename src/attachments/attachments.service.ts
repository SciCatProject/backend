import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { InjectModel } from "@nestjs/mongoose";
import {
  DeleteResult,
  FilterQuery,
  Model,
  PipelineStage,
  QueryOptions,
} from "mongoose";
import { Attachment, AttachmentDocument } from "./schemas/attachment.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import {
  addCreatedByFields,
  addUpdatedByField,
  parsePipelineProjection,
  parsePipelineSort,
} from "src/common/utils";
import { isEmpty } from "lodash";
import { CreateAttachmentV4Dto } from "./dto/create-attachment.v4.dto";
import { PartialUpdateAttachmentV4Dto } from "./dto/update-attachment.v4.dto";
import { PartialUpdateAttachmentV3Dto } from "./dto-obsolete/update-attachment.v3.dto";
import { CreateAttachmentV3Dto } from "./dto-obsolete/create-attachment.v3.dto";
import { AttachmentRelationTargetType } from "./types/relationship-filter.enum";
import { OutputAttachmentV3Dto } from "./dto-obsolete/output-attachment.v3.dto";
import { OutputAttachmentV4Dto } from "./dto/output-attachment.v4.dto";
import { CountApiResponse } from "src/common/types";

@Injectable({ scope: Scope.REQUEST })
export class AttachmentsService {
  constructor(
    @InjectModel(Attachment.name) private attachmentModel: Model<Attachment>,
    @Inject(REQUEST) private request: Request,
  ) {}

  async create(
    createAttachmentDto: CreateAttachmentV3Dto,
  ): Promise<OutputAttachmentV3Dto> {
    const username = (this.request?.user as JWTUser).username;

    const convertedDto =
      this.convertObsoleteDtoToCurrentSchema(createAttachmentDto);
    const createdAttachment = new this.attachmentModel(
      addCreatedByFields(convertedDto, username),
    );
    const newAttachment = await createdAttachment.save();
    const newAttachmentObj = newAttachment.toObject();
    const revertedNewAttachment =
      this.revertCurrentSchemaToObsoleteDto(newAttachmentObj);

    return revertedNewAttachment;
  }

  async findAll(
    filter: FilterQuery<AttachmentDocument>,
  ): Promise<OutputAttachmentV3Dto[]> {
    const convertedFilter =
      this.convertObsoleteWhereFilterToCurrentSchema(filter);
    return await this.findAllComplete({ where: convertedFilter });
  }
  async findAllComplete(
    filter: FilterQuery<AttachmentDocument>,
  ): Promise<OutputAttachmentV3Dto[]> {
    const whereFilter: FilterQuery<AttachmentDocument> = filter.where ?? {};
    const fieldsProjection: string[] = filter.fields ?? {};
    const limits: QueryOptions<AttachmentDocument> = filter.limits ?? {
      limit: 10,
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

    pipeline.push({ $limit: limits.limit || 10 });

    const data = await this.attachmentModel
      .aggregate<Attachment>(pipeline)
      .exec();

    const revertedData = data.map((item) => {
      return this.revertCurrentSchemaToObsoleteDto(item);
    });

    return revertedData;
  }

  async findOne(
    filter: FilterQuery<AttachmentDocument>,
    projection?: Record<string, unknown>,
  ): Promise<OutputAttachmentV3Dto | null> {
    const convertedFilter =
      this.convertObsoleteWhereFilterToCurrentSchema(filter);

    const result = await this.attachmentModel
      .findOne(convertedFilter, projection ?? {})
      .lean()
      .exec();

    if (result) {
      const revertedResult = this.revertCurrentSchemaToObsoleteDto(result);
      return revertedResult;
    }

    return result;
  }

  async findOneAndUpdate(
    filter: FilterQuery<AttachmentDocument>,
    updateAttachmentDto: PartialUpdateAttachmentV3Dto,
  ): Promise<OutputAttachmentV3Dto | null> {
    const username = (this.request?.user as JWTUser).username;
    const convertedFilter =
      this.convertObsoleteWhereFilterToCurrentSchema(filter);
    const convertedDto =
      this.convertObsoleteDtoToCurrentSchema(updateAttachmentDto);

    const result = await this.attachmentModel
      .findOneAndUpdate(
        convertedFilter,
        addUpdatedByField(convertedDto, username),
        { new: true },
      )
      .lean()
      .exec();

    if (result) {
      const revertedResult = this.revertCurrentSchemaToObsoleteDto(result);
      return revertedResult;
    }

    return result;
  }

  async findOneAndDelete(
    filter: FilterQuery<AttachmentDocument>,
  ): Promise<unknown> {
    const convertedFilter =
      this.convertObsoleteWhereFilterToCurrentSchema(filter);
    return this.attachmentModel.findOneAndDelete(convertedFilter).lean().exec();
  }

  async removeMany(
    filter: FilterQuery<AttachmentDocument>,
  ): Promise<DeleteResult> {
    const convertedFilter = this.convertObsoleteWhereFilterToCurrentSchema(
      filter.where,
    );
    return this.attachmentModel.deleteMany(convertedFilter).exec();
  }

  convertObsoleteWhereFilterToCurrentSchema(
    filter: FilterQuery<AttachmentDocument>,
  ): FilterQuery<AttachmentDocument> {
    let whereFilter: FilterQuery<AttachmentDocument> = {};

    if ("sampleId" in filter) {
      whereFilter = {
        "relationships.targetId": filter.sampleId,
        "relationships.targetType": AttachmentRelationTargetType.Sample,
      };
    } else if ("datasetId" in filter) {
      whereFilter = {
        "relationships.targetId": filter.datasetId,
        "relationships.targetType": AttachmentRelationTargetType.Dataset,
      };
    } else if ("proposalId" in filter) {
      whereFilter = {
        "relationships.targetId": filter.proposalId,
        "relationships.targetType": AttachmentRelationTargetType.Proposal,
      };
    } else {
      // If no legacy keys are present, return the original filter.
      return filter;
    }

    const idConditions: FilterQuery<AttachmentDocument> = {};

    if ("id" in filter) {
      // if _id is provided, use it to filter by _id.
      idConditions["_id"] = filter["id"];
    }

    if (Object.keys(idConditions).length > 0) {
      if (Object.keys(whereFilter).length === 0) {
        return idConditions;
      }
      return { $and: [whereFilter, idConditions] };
    }

    return whereFilter;
  }

  private convertObsoleteDtoToCurrentSchema(
    attachmentDto: CreateAttachmentV3Dto | PartialUpdateAttachmentV3Dto,
  ): CreateAttachmentV4Dto | PartialUpdateAttachmentV4Dto {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const converted = { ...attachmentDto } as any;
    converted.relationships = converted.relationships || [];
    if ("datasetId" in converted && converted.datasetId) {
      converted.relationships.push({
        targetId: converted.datasetId,
        targetType: AttachmentRelationTargetType.Dataset,
        relationType: "is attached to",
      });
      delete converted.datasetId;
    }
    if ("sampleId" in converted && converted.sampleId) {
      converted.relationships.push({
        targetId: converted.sampleId,
        targetType: AttachmentRelationTargetType.Sample,
        relationType: "is attached to",
      });
      delete converted.sampleId;
    }
    if ("proposalId" in converted && converted.proposalId) {
      converted.relationships.push({
        targetId: converted.proposalId,
        targetType: AttachmentRelationTargetType.Proposal,
        relationType: "is attached to",
      });
      delete converted.proposalId;
    }

    return converted;
  }
  private revertCurrentSchemaToObsoleteDto(
    dto: OutputAttachmentV4Dto,
  ): OutputAttachmentV3Dto {
    if (!dto.relationships || dto.relationships.length === 0) {
      return dto;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const reverted = { ...dto } as any;

    for (const relation of reverted.relationships) {
      switch (relation.targetType) {
        case AttachmentRelationTargetType.Dataset:
          reverted.datasetId = relation.targetId || "";
          break;
        case AttachmentRelationTargetType.Sample:
          reverted.sampleId = relation.targetId || "";
          break;
        case AttachmentRelationTargetType.Proposal:
          reverted.proposalId = relation.targetId || "";
          break;
      }
    }

    reverted.id = reverted.aid;

    delete reverted.aid;
    delete reverted.relationships;
    return reverted;
  }

  async count(
    filter: FilterQuery<AttachmentDocument>,
  ): Promise<CountApiResponse> {
    const convertedWhere = this.convertObsoleteWhereFilterToCurrentSchema(
      filter.where,
    );

    const datasets = await this.findAllComplete({
      where: convertedWhere,
      fields: ["_id"],
    });

    return { count: datasets.length };
  }
}
