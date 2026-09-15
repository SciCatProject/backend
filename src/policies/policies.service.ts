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
import { flattenToDotPaths, liveFilter } from "./utils/policy.util";
import {
  findUniqueByType,
  hasArchiveFields,
  hasRetrieveFields,
  mergeArchiveRetrieveToLegacyDto,
  toArchivePolicy,
  toRetrievePolicy,
} from "./utils/policy-legacy-shape.util";

/**
 * Backs the v3 policy API: one flat "policy" resource per ownerGroup,
 * hardcoding exactly two job types (archive/retrieve), merged/split from two
 * Policy documents. Owns its own Mongoose model access directly - it does
 * not share a persistence layer with PoliciesV4Service, which backs the
 * unrelated, much simpler v4 shape (one document per resource, no merge).
 * The two are independent on purpose: forcing them through a common DAO
 * would mean that DAO's shape had to satisfy both a legacy compatibility
 * shim and a clean, versioned API at once.
 */
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
      Logger.warn(
        "===================================================",
        "PoliciesService",
      );
      Logger.warn(
        "    Warning: your DB contains old ID format   ",
        "PoliciesService",
      );
      Logger.warn(
        "    please run the script                     ",
        "PoliciesService",
      );
      Logger.warn(
        "= scicat-backend-next/scripts/replaceObjectIds.sh =",
        "PoliciesService",
      );
      Logger.warn(
        "     on your mongo DB !                        \n",
        "PoliciesService",
      );
      Logger.warn(
        "===================================================\n",
        "PoliciesService",
      );
    } else {
      Logger.log(
        "Mongo DB already translated to new ID format",
        "PoliciesService",
      );
    }
  }

  async create(body: CreatePolicyDto): Promise<PolicyObsoleteDto | null> {
    const [archive, retrieve] = await Promise.all([
      this.persistNew(toArchivePolicy(body)),
      this.persistNew(toRetrievePolicy(body)),
    ]);
    return mergeArchiveRetrieveToLegacyDto(archive, retrieve);
  }

  async findAll(filter: IPolicyFilterV4): Promise<PolicyObsoleteDto[]> {
    const { limit, skip, sort } = parseLimitFilters(filter.limits ?? {});
    return this.findMergedPolicies(filter.where ?? {}, { limit, skip, sort });
  }

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
      { $match: liveFilter(where) },
      {
        $group: {
          _id: "$ownerGroup",
          docs: { $push: "$$ROOT" },
          sortValue: { $first: `$${sortField}` },
        },
      },
      { $match: { "docs.type": { $in: ["archive", "retrieve"] } } },
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

  async count(where: FilterQuery<PolicyDocument>): Promise<{ count: number }> {
    // v3 exposes one policy "resource" per ownerGroup, so count distinct
    // ownerGroups, not the number of (ownerGroup, type) documents.
    const ownerGroups = await this.policyModel
      .distinct("ownerGroup", liveFilter(where))
      .exec();
    return { count: ownerGroups.length };
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

    // Upserts the touched side(s) rather than silently no-op'ing when a
    // sibling document doesn't exist yet: a v3 client has no concept that
    // "the retrieve side of this resource might not exist" - it's patching
    // one resource that has always had all these fields, so a plain,
    // create-nothing PATCH would silently drop the write. v4's PATCH stays
    // strict (id-based, already requires an existing document), so this
    // relaxation is scoped to the v3 compatibility path only.
    await Promise.all([
      hasArchiveFields(body)
        ? this.persistUpdate(
            { ownerGroup: anyPolicy.ownerGroup, type: "archive" },
            toArchivePolicy(body),
          )
        : null,
      hasRetrieveFields(body)
        ? this.persistUpdate(
            { ownerGroup: anyPolicy.ownerGroup, type: "retrieve" },
            toRetrievePolicy(body),
          )
        : null,
    ]);

    // Re-fetch by the *new* ownerGroup, not anyPolicy's pre-update value:
    // ownerGroup is itself a patchable common field (see
    // hasArchiveFields/hasRetrieveFields above), and persistUpdate above
    // already wrote body.ownerGroup to both documents when present - using
    // the stale value here would look for documents that no longer exist
    // under it, silently returning null instead of the updated policy.
    const [merged] = await this.findMergedPolicies({
      ownerGroup: body.ownerGroup ?? anyPolicy.ownerGroup,
    });
    return merged ?? null;
  }

  async remove(id: string): Promise<unknown> {
    const anyPolicy = await this.policyModel
      .findOne(liveFilter({ _id: id }))
      .exec();
    if (!anyPolicy) return null;

    // Only the live documents - historical documents marked supersededBy
    // are kept for audit purposes and must survive an unrelated delete.
    return this.policyModel
      .deleteMany(liveFilter({ ownerGroup: anyPolicy.ownerGroup }))
      .exec();
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
          // NOTE: this only checks whether the user manages *any* of this
          // ownerGroup's per-type policies, not specifically the type(s)
          // being touched by `data` - same coarse, all-or-nothing semantics
          // as before the type split.
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
          // allow all functional users; upsert since addDefaultPolicy only
          // bootstraps a *missing* ownerGroup, not a partially-missing one
          // (e.g. archive exists but retrieve doesn't).
          return await Promise.all([
            updateArchive
              ? this.persistUpdate(
                  { ownerGroup, type: "archive" },
                  toArchivePolicy(data),
                )
              : null,
            updateRetrieve
              ? this.persistUpdate(
                  { ownerGroup, type: "retrieve" },
                  toRetrievePolicy(data),
                )
              : null,
          ]);
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
      await Promise.all([
        this.persistNew(toArchivePolicy(defaultPolicyBody), policyUsername),
        this.persistNew(toRetrievePolicy(defaultPolicyBody), policyUsername),
      ]);
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

  private async siblingsOf(ownerGroup: string): Promise<PolicyDocument[]> {
    return this.policyModel.find(liveFilter({ ownerGroup })).exec();
  }

  // NOTE: checks whether the user manages *any* of this ownerGroup's
  // per-type policies, not a specific one - see the comment in updateWhere
  // for why this stays coarse for now.
  private async validatePermission(
    ownerGroup: string,
    email: string,
  ): Promise<boolean> {
    const policies = await this.siblingsOf(ownerGroup);
    return policies.some((policy) => policy.manager?.includes(email));
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

  /**
   * Upserts the one document matching `filter`: updates it if it exists,
   * creates it otherwise - any equality conditions in `filter` (e.g.
   * ownerGroup/type) are applied to the new document by Mongo itself.
   * `createdBy` is set only on an actual insert, via $setOnInsert; existing
   * documents keep their original `createdBy`/`createdAt`. Always upserts:
   * every caller in this class needs it (a v3 PATCH must create a missing
   * archive/retrieve sibling rather than silently no-op - see `update`
   * below), so there's no plain-update variant to choose between.
   *
   * Concurrent upserts for the same (ownerGroup, type) can still race past
   * each other and hit the unique index - MongoDB's own recommended pattern
   * for this is to retry as a plain (non-upsert) update, which is what the
   * catch below does; the loser of the race ends up updating the winner's
   * document instead of failing outright.
   */
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
      if ((error as { code?: number }).code === 11000) {
        return this.policyModel
          .findOneAndUpdate(
            liveMatch,
            { $set: setFields },
            { new: true, runValidators: true },
          )
          .exec();
      }
      throw error;
    }
  }
}
