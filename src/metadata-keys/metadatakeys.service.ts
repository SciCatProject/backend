import { Injectable, Logger, Scope } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  MetadataKeyClass,
  MetadataKeyDocument,
} from "./schemas/metadatakey.schema";
import {
  DeleteResult,
  FilterQuery,
  HydratedDocument,
  Model,
  PipelineStage,
  QueryOptions,
} from "mongoose";
import { isEmpty } from "lodash";
import {
  addCreatedByFields,
  parsePipelineProjection,
  parsePipelineSort,
} from "src/common/utils";

type ScientificMetadataEntry = {
  human_name?: string;
};

export type MetadataSourceDoc = {
  sourceId: string;
  sourceType: string;
  ownerGroup: string;
  accessGroups: string[];
  isPublished: boolean;
  metadata: Record<string, unknown>;
};

@Injectable({ scope: Scope.REQUEST })
export class MetadataKeysService {
  constructor(
    @InjectModel(MetadataKeyClass.name)
    private metadataKeyModel: Model<MetadataKeyDocument>,
  ) {}

  async findAll(
    filter: FilterQuery<MetadataKeyDocument>,
    accessFilter: FilterQuery<MetadataKeyDocument>,
  ): Promise<MetadataKeyClass[]> {
    const whereFilter: FilterQuery<MetadataKeyDocument> = filter.where ?? {};
    const fieldsProjection: string[] = filter.fields ?? {};
    const limits: QueryOptions<MetadataKeyDocument> = filter.limits ?? {
      limit: 100,
      skip: 0,
      sort: { createdAt: "desc" },
    };

    const pipeline: PipelineStage[] = [
      {
        $match: {
          $and: [accessFilter, whereFilter],
        },
      },
    ];
    if (!isEmpty(fieldsProjection)) {
      const projection = parsePipelineProjection(fieldsProjection);
      pipeline.push({ $project: projection });
    }

    if (!isEmpty(limits.sort)) {
      const sort = parsePipelineSort(limits.sort);
      pipeline.push({ $sort: sort });
    }

    pipeline.push({ $skip: limits.skip || 0 });

    pipeline.push({ $limit: limits.limit || 100 });

    const data = await this.metadataKeyModel
      .aggregate<MetadataKeyClass>(pipeline)
      .exec();

    return data;
  }

  async deleteMany(
    filter: FilterQuery<MetadataKeyDocument>,
  ): Promise<DeleteResult> {
    const result = await this.metadataKeyModel.deleteMany(filter).exec();

    Logger.log(
      `MetadataKeys deleted: ${result.deletedCount ?? 0} With filter:`,
      { filter },
    );

    return result;
  }

  async insertManyFromSource(
    doc: MetadataSourceDoc,
  ): Promise<HydratedDocument<MetadataKeyDocument>[] | void> {
    if (isEmpty(doc.metadata)) {
      return;
    }
    const userGroups = Array.from(
      new Set([doc.ownerGroup, ...(doc.accessGroups ?? [])].filter(Boolean)),
    ) as string[];

    const isPublished = doc.isPublished;

    const metadata = doc.metadata ?? {};

    const docs = Object.entries(metadata).map(([key, entry]) => {
      const createMetadataKeyDto = {
        _id: `${doc.sourceType}_${doc.sourceId}_${key}`,
        id: `${doc.sourceType}_${doc.sourceId}_${key}`,
        sourceType: doc.sourceType,
        sourceId: doc.sourceId,
        key,
        userGroups,
        isPublished,
        humanReadableName: (entry as ScientificMetadataEntry).human_name ?? "",
      };
      return addCreatedByFields(createMetadataKeyDto, "system");
    });

    Logger.log(
      `Created ${docs.length} MetadataKeys from source ${doc.sourceType} with ID ${doc.sourceId}`,
    );

    return await this.metadataKeyModel.insertMany(docs);
  }

  async replaceManyFromSource(doc: MetadataSourceDoc): Promise<void> {
    await this.deleteMany({
      sourceId: doc.sourceId,
      sourceType: doc.sourceType,
    });
    await this.insertManyFromSource(doc);
  }
}
