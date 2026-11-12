import {
  ConflictException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { FilterQuery, Model, PipelineStage } from "mongoose";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { UsersService } from "src/users/users.service";
import {
  addCreatedByFields,
  parseLimitFilters,
  parsePipelineSort,
} from "src/common/utils";
import { Policy, PolicyDocument } from "./schemas/policy.schema";
import { PolicyObsoleteDto } from "./dto/policy.obsolete.dto";
import { CreatePolicyDto } from "./dto/create-policy.dto";
import {
  PartialUpdatePolicyDto,
  UpdatePolicyDto,
} from "./dto/update-policy.dto";
import { IPolicyFilterV4 } from "./interfaces/policy-filters.interface";
import {
  flattenToDotPaths,
  liveFilter,
  mergedSortFieldPath,
  prefixMergedFilterFields,
} from "./utils/policy.util";
import {
  findUniqueByType,
  hasArchiveFields,
  hasRetrieveFields,
  mergeArchiveRetrieveToLegacyDto,
  toArchivePolicy,
  toRetrievePolicy,
} from "./utils/policy-legacy-shape.util";

// Backs the v3 policy API: one flat "policy" resource per ownerGroup,
// merged/split from an archive and a retrieve Policy document. Independent
// of PoliciesV4Service, which backs the simpler v4 shape (one document per
// resource, no merge).
@Injectable()
export class PoliciesService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    @InjectModel(Policy.name) private policyModel: Model<PolicyDocument>,
    private usersService: UsersService,
    @Inject(REQUEST) private request: Request,
  ) {}

  async onModuleInit(): Promise<void> {
    const count = await this.policyModel
      .countDocuments({
        $or: [
          {
            _id: {
              $regex: /^[a-f\d]{24}$/i,
            },
          },
          {
            _id: {
              $type: "objectId",
            },
          },
        ],
      })
      .exec();

    if (count !== 0) {
      this.logBanner([
        "    Warning: your DB contains old ID format   ",
        "    please run the script                     ",
        "= scicat-backend-next/scripts/replaceObjectIds.sh =",
        "     on your mongo DB !                        \n",
      ]);
    } else {
      Logger.log(
        "Mongo DB already translated to new ID format",
        "PoliciesService",
      );
    }

    // Every v3 read/write depends on `type`, which only exists once
    // migrations/20260903120000-policy-type-split-migration.js has run -
    // until then this fails silently (empty results) rather than erroring.
    const unsplitCount = await this.policyModel
      .countDocuments({ type: { $exists: false } })
      .exec();

    if (unsplitCount !== 0) {
      this.logBanner([
        `    Warning: ${unsplitCount} Policy document(s) haven't been   `,
        "    split into archive/retrieve documents yet -      ",
        "    every v3 policy read/write for those ownerGroups  ",
        "    will silently behave as if the policy doesn't exist.",
        "    Please run the migration                        ",
        "= migrations/20260903120000-policy-type-split-migration.js =",
        "    on your mongo DB before serving traffic !          \n",
      ]);
    }
  }

  private logBanner(lines: string[]): void {
    const divider = "===================================================";
    Logger.warn(divider, "PoliciesService");
    for (const line of lines) {
      Logger.warn(line, "PoliciesService");
    }
    Logger.warn(`${divider}\n`, "PoliciesService");
  }

  // ---- Public API ----

  async create(body: CreatePolicyDto): Promise<PolicyObsoleteDto | null> {
    const [archive, retrieve] = await this.persistNewPair(
      toArchivePolicy(body),
      toRetrievePolicy(body),
    );
    return mergeArchiveRetrieveToLegacyDto(archive, retrieve);
  }

  async findAll(filter: IPolicyFilterV4): Promise<PolicyObsoleteDto[]> {
    const { limit, skip, sort } = parseLimitFilters(filter.limits ?? {});
    return this.findMergedPolicies(filter.where ?? {}, { limit, skip, sort });
  }

  async count(where: FilterQuery<PolicyDocument>): Promise<{ count: number }> {
    // Count distinct ownerGroups against the merged representation, not
    // the number of matching (ownerGroup, type) documents.
    const pipeline: PipelineStage[] = [
      ...this.buildOwnerGroupGroupingStages(),
      { $match: prefixMergedFilterFields(where) },
      { $count: "count" },
    ];
    const [result] = await this.policyModel
      .aggregate<{ count: number }>(pipeline)
      .exec();
    return { count: result?.count ?? 0 };
  }

  async findOne(id: string): Promise<PolicyObsoleteDto | null> {
    const anyPolicy = await this.policyModel
      .findOne(liveFilter({ _id: id }))
      .exec();
    if (!anyPolicy) return null;

    const [merged] = await this.findMergedPolicies({
      ownerGroup: anyPolicy.ownerGroup,
    });
    return merged ?? null;
  }

  async update(
    id: string,
    body: PartialUpdatePolicyDto,
  ): Promise<PolicyObsoleteDto | null> {
    const anyPolicy = await this.policyModel
      .findOne(liveFilter({ _id: id }))
      .exec();
    if (!anyPolicy) return null;

    // Upserts the touched side(s): a v3 PATCH has no concept that one side
    // might not exist yet, so a plain update would silently drop the
    // write. v4's PATCH stays strict; this relaxation is v3-only.
    await this.persistUpdatePair(
      anyPolicy.ownerGroup,
      { archive: hasArchiveFields(body), retrieve: hasRetrieveFields(body) },
      toArchivePolicy(body),
      toRetrievePolicy(body),
    );

    // Re-fetch by the *new* ownerGroup: it's itself a patchable field, and
    // persistUpdatePair already wrote it above - the stale value would
    // look up documents that no longer exist under it.
    const [merged] = await this.findMergedPolicies({
      ownerGroup: body.ownerGroup ?? anyPolicy.ownerGroup,
    });
    return merged ?? null;
  }

  async remove(id: string): Promise<PolicyObsoleteDto | null> {
    const anyPolicy = await this.policyModel
      .findOne(liveFilter({ _id: id }))
      .exec();
    if (!anyPolicy) return null;

    // Fetched before deleting: deleteMany's raw result doesn't match the
    // PolicyObsoleteDto shape this endpoint is declared to return.
    const [merged] = await this.findMergedPolicies({
      ownerGroup: anyPolicy.ownerGroup,
    });

    // Only live documents - supersededBy history must survive.
    await this.policyModel
      .deleteMany(liveFilter({ ownerGroup: anyPolicy.ownerGroup }))
      .exec();

    return merged ?? null;
  }

  async updateWhere(ownerGroupList: string, data: Partial<UpdatePolicyDto>) {
    if (!ownerGroupList) {
      throw new InternalServerErrorException(
        "Invalid ownerGroupList parameter",
      );
    }

    const ownerGroups = ownerGroupList
      .split(",")
      .map((ownerGroup) => ownerGroup.trim().replace(new RegExp('"', "g"), ""));
    if (!ownerGroups) {
      throw new InternalServerErrorException(
        "Invalid ownerGroupList parameter",
      );
    }

    const userId = (this.request.user as JWTUser)._id;
    const userIdentity = await this.usersService.findByIdUserIdentity(userId);
    const user = await this.usersService.findById(userId);
    if (!user) {
      throw new NotFoundException();
    }

    const updateArchive = hasArchiveFields(data);
    const updateRetrieve = hasRetrieveFields(data);

    await Promise.all(
      ownerGroups.map(async (ownerGroup) => {
        const email = userIdentity ? userIdentity.profile.email : user.email;

        try {
          await this.addDefaultPolicy(ownerGroup, [], email, "low");
        } catch (error) {
          throw new InternalServerErrorException(error);
        }

        if (userIdentity) {
          // Coarse: checks the user manages *any* policy for this
          // ownerGroup, not specifically the type(s) being touched.
          const hasPermission = await this.validatePermission(
            ownerGroup,
            userIdentity.profile.email,
          );
          if (!hasPermission) {
            Logger.error("Validation failed", "PoliciesService.updateWhere");
            throw new UnauthorizedException(
              "User not authorised for action based on policy",
            );
          }
        }

        try {
          await this.persistUpdatePair(
            ownerGroup,
            { archive: updateArchive, retrieve: updateRetrieve },
            toArchivePolicy(data),
            toRetrievePolicy(data),
          );
        } catch (error) {
          throw new InternalServerErrorException(error);
        }
      }),
    );
    return { message: "successful policy update" };
  }

  async findArchivePolicy(ownerGroup: string): Promise<PolicyDocument | null> {
    return this.policyModel
      .findOne(liveFilter({ ownerGroup, type: "archive" }))
      .exec();
  }

  async addDefaultPolicy(
    ownerGroup: string,
    accessGroups: string[],
    ownerEmail: string,
    tapeRedundancy: string,
    policyUsername: string | null = null,
  ) {
    const existing = await this.policyModel
      .findOne(liveFilter({ ownerGroup }))
      .exec();

    if (existing) {
      return;
    }

    Logger.log("Adding default policy", "PoliciesService.addDefaultPolicy");

    const defaultManager = this.configService.get<string[]>("defaultManager");
    const defaultPolicyBody: Partial<UpdatePolicyDto> = {
      ownerGroup,
      accessGroups,
      manager: ownerEmail
        ? ownerEmail.split(",")
        : defaultManager
          ? defaultManager
          : [""],
      tapeRedundancy: tapeRedundancy ? tapeRedundancy : "low",
      autoArchive: false,
      autoArchiveDelay: 7,
      archiveEmailNotification: true,
      retrieveEmailNotification: true,
      archiveEmailsToBeNotified: [],
      retrieveEmailsToBeNotified: [],
      embargoPeriod: 3,
    };

    try {
      await this.persistNewPair(
        toArchivePolicy(defaultPolicyBody),
        toRetrievePolicy(defaultPolicyBody),
        policyUsername,
      );
    } catch (error) {
      if (error instanceof ConflictException) {
        return;
      }
      throw new InternalServerErrorException(
        error,
        "Error when creating default policy",
      );
    }
  }

  // Coarse: checks the user manages *any* policy for this ownerGroup, not
  // a specific type - see updateWhere.
  private async validatePermission(
    ownerGroup: string,
    email: string,
  ): Promise<boolean> {
    const policies = await this.siblingsOf(ownerGroup);
    return policies.some((policy) => policy.manager?.includes(email));
  }

  private async siblingsOf(ownerGroup: string): Promise<PolicyDocument[]> {
    return this.policyModel.find(liveFilter({ ownerGroup })).exec();
  }

  // ---- Read / merge ----

  private async findMergedPolicies(
    where: FilterQuery<PolicyDocument>,
    {
      limit,
      skip,
      sort,
    }: {
      limit?: number;
      skip?: number;
      sort?: Record<string, "asc" | "desc">;
    } = {},
  ): Promise<PolicyObsoleteDto[]> {
    const [sortField, sortDirection] = Object.entries(
      (sort ?? {}) as Record<string, "asc" | "desc">,
    )[0] ?? ["ownerGroup", "asc"];
    const pipelineSort = parsePipelineSort({ sortValue: sortDirection });

    const pipeline: PipelineStage[] = [
      ...this.buildOwnerGroupGroupingStages(),
      { $match: prefixMergedFilterFields(where) },
      // Computed after grouping, not via $first during $group, so it's
      // deterministic rather than dependent on document push order.
      { $addFields: { sortValue: `$${mergedSortFieldPath(sortField)}` } },
      { $sort: pipelineSort },
    ];
    if (skip) pipeline.push({ $skip: skip });
    if (limit) pipeline.push({ $limit: limit });

    const groups = await this.policyModel
      .aggregate<{ _id: string; docs: Record<string, unknown>[] }>(pipeline)
      .exec();

    return groups
      .map((group) => group.docs.map((doc) => this.policyModel.hydrate(doc)))
      .map((docs) =>
        mergeArchiveRetrieveToLegacyDto(
          findUniqueByType(docs, "archive"),
          findUniqueByType(docs, "retrieve"),
        ),
      )
      .filter((policy): policy is PolicyObsoleteDto => policy !== null);
  }

  // Groups live documents by ownerGroup, then builds `archiveDoc`/
  // `retrieveDoc` (each side, or missing) and `merged` (archive fields
  // overridden by retrieve's, so a where/sort spanning both types can be
  // evaluated against one document instead of two). The handful of field
  // names ambiguous between archive/retrieve go through archiveDoc/
  // retrieveDoc directly instead - see AMBIGUOUS_TYPE_FIELD_MAP.
  private buildOwnerGroupGroupingStages(): PipelineStage[] {
    return [
      { $match: liveFilter({}) },
      { $group: { _id: "$ownerGroup", docs: { $push: "$$ROOT" } } },
      { $match: { "docs.type": { $in: ["archive", "retrieve"] } } },
      {
        $addFields: {
          archiveDoc: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$docs",
                  cond: { $eq: ["$$this.type", "archive"] },
                },
              },
              0,
            ],
          },
          retrieveDoc: {
            $arrayElemAt: [
              {
                $filter: {
                  input: "$docs",
                  cond: { $eq: ["$$this.type", "retrieve"] },
                },
              },
              0,
            ],
          },
        },
      },
      {
        $addFields: {
          // manager is unioned rather than overridden, since the two
          // documents' lists can diverge (each patchable independently via
          // PoliciesV4Service) - matches mergeArchiveRetrieveToLegacyDto.
          merged: {
            $mergeObjects: [
              "$retrieveDoc",
              "$archiveDoc",
              {
                manager: {
                  $setUnion: [
                    { $ifNull: ["$archiveDoc.manager", []] },
                    { $ifNull: ["$retrieveDoc.manager", []] },
                  ],
                },
              },
            ],
          },
        },
      },
    ];
  }

  // ---- Write orchestration (no transaction support - see PR #2864) ----

  // Sequential, not Promise.all, so a failed retrieve save can be cleaned
  // up instead of leaving a half-created v3 resource behind.
  private async persistNewPair(
    archiveDto: Partial<Policy>,
    retrieveDto: Partial<Policy>,
    policyUsername: string | null = null,
  ): Promise<[PolicyDocument, PolicyDocument]> {
    const archive = await this.persistNew(archiveDto, policyUsername);
    try {
      const retrieve = await this.persistNew(retrieveDto, policyUsername);
      return [archive, retrieve];
    } catch (error) {
      await this.policyModel.deleteOne({ _id: archive._id }).exec();
      throw error;
    }
  }

  // Sequential and snapshotted first: if the retrieve upsert fails after
  // archive already succeeded, archive is rolled back - deleted if this
  // call created it, restored otherwise - rather than left half-applied.
  private async persistUpdatePair(
    ownerGroup: string,
    touched: { archive: boolean; retrieve: boolean },
    archiveDto: Partial<Policy>,
    retrieveDto: Partial<Policy>,
  ): Promise<void> {
    const previousArchive = touched.archive
      ? await this.policyModel
          .findOne(liveFilter({ ownerGroup, type: "archive" }))
          .exec()
      : null;

    const archiveResult = touched.archive
      ? await this.persistUpdate({ ownerGroup, type: "archive" }, archiveDto)
      : null;

    try {
      if (touched.retrieve) {
        await this.persistUpdate({ ownerGroup, type: "retrieve" }, retrieveDto);
      }
    } catch (error) {
      // Roll back by _id: archiveDto may itself rename ownerGroup, and
      // _id stays stable regardless.
      if (archiveResult) {
        await this.restorePolicy({ _id: archiveResult._id }, previousArchive);
      }
      throw error;
    }
  }

  // Deletes the document if this call created it, restores the pre-update
  // snapshot otherwise.
  private async restorePolicy(
    filter: { _id: string },
    previous: PolicyDocument | null,
  ): Promise<void> {
    if (previous) {
      await this.policyModel.replaceOne(filter, previous.toObject()).exec();
    } else {
      await this.policyModel.deleteOne(filter).exec();
    }
  }

  private async persistNew(
    createPolicyDto: Partial<Policy>,
    policyUsername: string | null = null,
  ): Promise<PolicyDocument> {
    const username = policyUsername
      ? policyUsername
      : (this.request.user as JWTUser)?.username;
    if (!username) {
      throw new UnauthorizedException("User not present in the request");
    }

    const createdPolicy = new this.policyModel(
      addCreatedByFields(createPolicyDto, username),
    );

    try {
      return await createdPolicy.save();
    } catch (error) {
      if ((error as { code?: number }).code === 11000) {
        throw new ConflictException(
          `A policy for ownerGroup "${createPolicyDto.ownerGroup}" and type "${createPolicyDto.type}" already exists.`,
        );
      }
      throw error;
    }
  }

  // Upserts the document matching `filter`. Always upserts: a v3 PATCH
  // must create a missing archive/retrieve sibling, not silently no-op.
  // A concurrent upsert can race past this and hit the unique index; the
  // catch retries as a plain update (Mongo's recommended pattern), so the
  // loser of the race ends up updating the winner's document. If that
  // retry *also* hits E11000, it's a genuine conflict (e.g. renaming
  // ownerGroup onto one that already has a policy of this type), not a
  // race, and is translated to ConflictException.
  private async persistUpdate(
    filter: FilterQuery<PolicyDocument>,
    updatePolicyDto: Partial<Policy>,
  ): Promise<PolicyDocument | null> {
    const username = (this.request.user as JWTUser).username;
    const setFields = {
      ...flattenToDotPaths(updatePolicyDto),
      updatedBy: username,
    };
    const liveMatch = liveFilter(filter);

    try {
      return await this.policyModel
        .findOneAndUpdate(
          liveMatch,
          { $set: setFields, $setOnInsert: { createdBy: username } },
          {
            new: true,
            runValidators: true,
            upsert: true,
            setDefaultsOnInsert: true,
          },
        )
        .exec();
    } catch (error) {
      if ((error as { code?: number }).code !== 11000) {
        throw error;
      }
      try {
        return await this.policyModel
          .findOneAndUpdate(
            liveMatch,
            { $set: setFields },
            { new: true, runValidators: true },
          )
          .exec();
      } catch (retryError) {
        if ((retryError as { code?: number }).code === 11000) {
          const { ownerGroup, type } = filter as {
            ownerGroup?: string;
            type?: string;
          };
          throw new ConflictException(
            `A policy for ownerGroup "${updatePolicyDto.ownerGroup ?? ownerGroup}" and type "${type}" already exists.`,
          );
        }
        throw retryError;
      }
    }
  }
}
