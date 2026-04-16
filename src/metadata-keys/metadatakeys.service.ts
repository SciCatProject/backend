import { Injectable, Logger, Scope } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import {
  MetadataKeyClass,
  MetadataKeyDocument,
} from "./schemas/metadatakey.schema";
import { FilterQuery, Model, PipelineStage, QueryOptions } from "mongoose";
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
  sourceType: string;
  userGroups: string[];
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

  async deleteMany(doc: MetadataSourceDoc): Promise<void> {
    if (isEmpty(doc.metadata)) {
      return;
    }
    const metadataKeys = Object.keys(doc.metadata);
    const ids = metadataKeys.map((key) => `${doc.sourceType}_${key}`);
    const filter = { id: { $in: ids } };

    const decrementUsageOp = {
      updateMany: { filter, update: { $inc: { usageCount: -1 } } },
    };
    const deleteUnusedOp = {
      deleteMany: { filter: { ...filter, usageCount: { $lte: 0 } } },
    };

    await this.metadataKeyModel.bulkWrite([decrementUsageOp, deleteUnusedOp]);

    Logger.log(
      `Removed or decremented MetadataKeys usageCount from source ${doc.sourceType} for key(s): ${metadataKeys.join(", ")}`,
    );
  }

  async insertManyFromSource(doc: MetadataSourceDoc): Promise<void> {
    if (isEmpty(doc.metadata)) {
      return;
    }

    const metadata = doc.metadata;
    const userGroups = doc.userGroups;

    const upsertOps = Object.entries(metadata).map(([key, entry]) => {
      const id = `${doc.sourceType}_${key}`;
      const humanReadableName =
        (entry as ScientificMetadataEntry).human_name ?? "";
      return {
        updateOne: {
          filter: { id },
          update: {
            $setOnInsert: addCreatedByFields(
              {
                _id: id as MetadataKeyDocument["_id"],
                id,
                key,
                sourceType: doc.sourceType,
                humanReadableName,
              },
              "system",
            ),
            ...(doc.isPublished && { $set: { isPublished: true } }),
            $addToSet: { userGroups: { $each: userGroups } },
            $inc: { usageCount: 1 },
          },
          upsert: true,
        },
      };
    });

    await this.metadataKeyModel.bulkWrite(upsertOps);

    Logger.log(
      `Created or incremented MetadataKeys usageCount from source ${doc.sourceType} for key(s): ${Object.keys(metadata).join(", ")}`,
    );
  }

  async replaceManyFromSource(
    oldDoc: MetadataSourceDoc,
    newDoc: MetadataSourceDoc,
  ): Promise<void> {
    const oldKeys = Object.keys(oldDoc.metadata ?? {});
    const newKeys = Object.keys(newDoc.metadata ?? {});

    const addedKeys = newKeys.filter((k) => !oldKeys.includes(k));
    const removedKeys = oldKeys.filter((k) => !newKeys.includes(k));

    if (removedKeys.length > 0) {
      await this.deleteMany({
        ...oldDoc,
        metadata: Object.fromEntries(
          removedKeys.map((k) => [k, oldDoc.metadata[k]]),
        ),
      });
    }

    if (addedKeys.length > 0) {
      await this.insertManyFromSource({
        ...newDoc,
        metadata: Object.fromEntries(
          addedKeys.map((k) => [k, newDoc.metadata[k]]),
        ),
      });
    }
  }
}
