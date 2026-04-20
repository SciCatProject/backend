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

// Recomputes the userGroups string array from userGroupCounts after a decrement.
// Retains only group names whose reference count is still above zero.
const RECOMPUTE_USER_GROUPS_STAGE = [
  {
    $set: {
      userGroups: {
        $map: {
          input: {
            $filter: {
              input: { $objectToArray: "$userGroupCounts" },
              cond: { $gt: ["$$this.v", 0] },
            },
          },
          as: "entry",
          in: "$$entry.k",
        },
      },
    },
  },
];

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

  /**
   * Called when a dataset is created or gains new metadata keys.
   *
   * For each key:
   * - Creates a new MetadataKey entry if none exists (upsert)
   * - Increments usageCount and per-group reference counts
   * - Adds new groups to the userGroups query array
   * - Sets isPublished if the source dataset is published (never unsets inline)
   * - Updates humanReadableName to the latest value
   */
  async insertManyFromSource(doc: MetadataSourceDoc): Promise<void> {
    if (isEmpty(doc.metadata)) return;

    const { sourceType, userGroups, isPublished, metadata } = doc;

    const ops = Object.entries(metadata).map(([key, entry]) => {
      const humanReadableName =
        (entry as ScientificMetadataEntry).human_name ?? "";
      const id = this.buildId(sourceType, key, humanReadableName);

      return {
        updateOne: {
          filter: { _id: id },
          update: {
            $setOnInsert: addCreatedByFields(
              {
                _id: id as unknown as MetadataKeyDocument["_id"],
                id,
                key,
                sourceType,
                humanReadableName,
              },
              "system",
            ),
            $set: {
              // Only ever set to true inline. The false case is handled
              // by the reconciliation cronjob since it transitions rarely.
              ...(isPublished && { isPublished: true }),
            },
            $addToSet: { userGroups: { $each: userGroups } },
            $inc: {
              usageCount: 1,
              ...this.groupCountDeltas(userGroups, 1),
            },
          },
          upsert: true,
        },
      };
    });

    await this.metadataKeyModel.bulkWrite(ops);

    Logger.log(
      `Upserted MetadataKeys for ${sourceType}: ${Object.keys(metadata).join(", ")}`,
    );
  }

  /**
   * Called when a dataset is deleted or loses metadata keys.
   *
   * Three-step process to ensure groups are safely removed:
   *   1. Decrement usageCount and per-group reference counts
   *   2. Recompute userGroups array from the updated counts
   *      (drops any group whose count reached zero)
   *   3. Delete entries no longer referenced by any dataset
   *
   * usageCount is the authoritative deletion signal because a dataset
   * with no userGroups and isPublished: false would be invisible to
   * both userGroupCounts and isPublished checks.
   */
  async deleteMany(doc: MetadataSourceDoc): Promise<void> {
    if (isEmpty(doc.metadata)) return;

    const { sourceType, userGroups, metadata } = doc;
    const keys = Object.keys(metadata);
    const ids = keys.map((key) => {
      const humanReadableName =
        (metadata[key] as ScientificMetadataEntry)?.human_name ?? "";
      return this.buildId(sourceType, key, humanReadableName);
    });
    const filter = { _id: { $in: ids } };

    await this.metadataKeyModel.updateMany(filter, {
      $inc: {
        usageCount: -1,
        ...this.groupCountDeltas(userGroups, -1),
      },
    });

    await this.metadataKeyModel.updateMany(filter, RECOMPUTE_USER_GROUPS_STAGE);

    await this.metadataKeyModel.deleteMany({
      ...filter,
      usageCount: { $lte: 0 },
    });

    Logger.log(
      `Decremented or deleted MetadataKeys for ${sourceType}: ${keys.join(", ")}`,
    );
  }
  /**
   * Called when a dataset is updated.
   *
   * Diffs the old and new metadata to produce three disjoint key sets:
   *   - added:   only in newDoc → insertManyFromSource
   *   - removed: only in oldDoc → deleteMany
   *   - shared:  in both       → updateSharedKeys (handles group / isPublished
   *                              / humanReadableName changes)
   *
   * The three sets are disjoint by _id so Promise.all is safe.
   */
  async replaceManyFromSource(
    oldDoc: MetadataSourceDoc,
    newDoc: MetadataSourceDoc,
  ): Promise<void> {
    const oldKeys = Object.keys(oldDoc.metadata ?? {});
    const newKeys = Object.keys(newDoc.metadata ?? {});

    const addedKeys = newKeys.filter((k) => !oldKeys.includes(k));
    const removedKeys = oldKeys.filter((k) => !newKeys.includes(k));
    const sharedKeys = newKeys.filter((k) => oldKeys.includes(k));

    await Promise.all([
      removedKeys.length > 0 &&
        this.deleteMany({
          ...oldDoc,
          metadata: Object.fromEntries(
            removedKeys.map((k) => [k, oldDoc.metadata[k]]),
          ),
        }),

      addedKeys.length > 0 &&
        this.insertManyFromSource({
          ...newDoc,
          metadata: Object.fromEntries(
            addedKeys.map((k) => [k, newDoc.metadata[k]]),
          ),
        }),

      sharedKeys.length > 0 &&
        this.updateSharedKeys(sharedKeys, oldDoc, newDoc),
    ]);
  }

  private buildId(
    sourceType: string,
    key: string,
    humanReadableName: string,
  ): string {
    return `${sourceType}_${key}_${humanReadableName}`;
  }

  /**
   * Builds $inc paths for per-group reference counts.
   *
   * groupCountDeltas(["groupA", "groupB"], 1)
   *   => { "userGroupCounts.groupA": 1, "userGroupCounts.groupB": 1 }
   *
   * MongoDB's dot-notation $inc creates the key if missing and increments
   * if it already exists, making this safe for both first-time and
   * subsequent upserts.
   */
  private groupCountDeltas(
    groups: string[],
    delta: 1 | -1,
  ): Record<string, number> {
    return Object.fromEntries(
      groups.map((g) => [`userGroupCounts.${g}`, delta]),
    );
  }

  /**
   * Handles keys present in both the old and new dataset version.
   *
   * Checks three things that may have changed independently:
   *   1. userGroups — increments added groups, decrements removed groups,
   *      then recomputes the userGroups array from the updated counts
   *   2. isPublished — only sets true inline; false is left to the cronjob
   *   3. humanReadableName — updated per-key where it differs
   */
  private async updateSharedKeys(
    sharedKeys: string[],
    oldDoc: MetadataSourceDoc,
    newDoc: MetadataSourceDoc,
  ): Promise<void> {
    const { sourceType } = newDoc;
    const ids = sharedKeys.map((k) => {
      const humanReadableName =
        (newDoc.metadata[k] as ScientificMetadataEntry)?.human_name ?? "";
      return this.buildId(sourceType, k, humanReadableName);
    });
    const filter = { _id: { $in: ids } };

    const addedGroups = newDoc.userGroups.filter(
      (g) => !oldDoc.userGroups.includes(g),
    );
    const removedGroups = oldDoc.userGroups.filter(
      (g) => !newDoc.userGroups.includes(g),
    );
    const publishedFlippedOn = !oldDoc.isPublished && newDoc.isPublished;
    const hasGroupChanges = addedGroups.length > 0 || removedGroups.length > 0;

    if (hasGroupChanges || publishedFlippedOn) {
      await this.metadataKeyModel.updateMany(filter, {
        ...(addedGroups.length > 0 && {
          $addToSet: { userGroups: { $each: addedGroups } },
        }),
        $inc: {
          ...(addedGroups.length > 0 && this.groupCountDeltas(addedGroups, 1)),
          ...(removedGroups.length > 0 &&
            this.groupCountDeltas(removedGroups, -1)),
        },
        ...(publishedFlippedOn && { $set: { isPublished: true } }),
      });

      // Recompute userGroups to drop groups whose count reached zero
      if (removedGroups.length > 0) {
        await this.metadataKeyModel.updateMany(
          filter,
          RECOMPUTE_USER_GROUPS_STAGE,
        );
      }
    }

    // humanReadableName is part of _id, so a change means a different document.
    // Treat it as delete the old entry + insert the new one.
    const humanNameChangedKeys = sharedKeys.filter((k) => {
      const oldName =
        (oldDoc.metadata[k] as ScientificMetadataEntry)?.human_name ?? "";
      const newName =
        (newDoc.metadata[k] as ScientificMetadataEntry)?.human_name ?? "";
      return oldName !== newName;
    });

    if (humanNameChangedKeys.length > 0) {
      await Promise.all([
        this.deleteMany({
          ...oldDoc,
          metadata: Object.fromEntries(
            humanNameChangedKeys.map((k) => [k, oldDoc.metadata[k]]),
          ),
        }),
        this.insertManyFromSource({
          ...newDoc,
          metadata: Object.fromEntries(
            humanNameChangedKeys.map((k) => [k, newDoc.metadata[k]]),
          ),
        }),
      ]);
    }
  }
}
