import {
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
  PreconditionFailedException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model } from "mongoose";
import { LEGACY_NOTIFICATION_PIPE } from "./pipes/legacy-notification.pipe";
import { Policy, PolicyDocument } from "./schemas/policy.schema";
import { Request } from "express";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { UsersService } from "src/users/users.service";
import { IPolicyFilterV4 } from "./interfaces/policy-filters.interface";
import { addCreatedByFields, parseLimitFilters } from "src/common/utils";
import { REQUEST } from "@nestjs/core";
import { withOCCFilter } from "src/datasets/utils/occ-util";

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

  async create(
    createPolicyDto: Partial<Policy>,
    policyUsername: string | null = null,
  ): Promise<Policy> {
    const username = policyUsername
      ? policyUsername
      : (this.request.user as JWTUser)?.username;
    if (!username) {
      throw new UnauthorizedException("User not present in the request");
    }

    const createdPolicy = new this.policyModel(
      addCreatedByFields(createPolicyDto, username),
    );

    return createdPolicy.save();
  }

  async findAll(filter: IPolicyFilterV4): Promise<Policy[]> {
    const whereFilter: FilterQuery<PolicyDocument> = filter.where ?? {};
    const fieldsProjection = filter.fields?.length
      ? Object.fromEntries(filter.fields.map((field) => [field, 1]))
      : {};
    const { limit, skip, sort } = parseLimitFilters(filter.limits ?? {});

    return this.policyModel
      .find(whereFilter, fieldsProjection)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .exec();
  }

  async count(where: FilterQuery<PolicyDocument>): Promise<{ count: number }> {
    const count = await this.policyModel.countDocuments(where).exec();
    return { count };
  }

  async findOne(filter: FilterQuery<PolicyDocument>): Promise<Policy | null> {
    return this.policyModel.findOne(filter).exec();
  }

  // Turns a nested object into Mongo dot-path leaf keys (e.g.
  // {jobPolicies: {archive: {emailTo: [...]}}} ->
  // {"jobPolicies.archive.emailTo": [...]}), so a patch touching one field
  // doesn't $set-clobber its untouched siblings. Top-level scalar/array
  // fields (ownerGroup, manager, ...) come out as bare keys, unprefixed.
  // Arrays are left as leaf values, not recursed into.
  private flattenToDotPaths(
    obj: Record<string, unknown>,
    prefix = "",
  ): Record<string, unknown> {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj)) {
      const path = prefix ? `${prefix}.${key}` : key;
      if (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
      ) {
        Object.assign(
          result,
          this.flattenToDotPaths(value as Record<string, unknown>, path),
        );
      } else {
        result[path] = value;
      }
    }
    return result;
  }

  async update(
    filter: FilterQuery<PolicyDocument>,
    updatePolicyDto: Partial<Policy>,
    unmodifiedSince?: Date,
    isMergePatch = false,
  ): Promise<Policy | null> {
    const username = (this.request.user as JWTUser).username;
    const flattened = this.flattenToDotPaths(updatePolicyDto);
    // application/json: a null value means "do not change this field".
    // application/merge-patch+json: a null value means "reset this field to null".
    const setFields = Object.fromEntries(
      Object.entries(flattened).filter(
        ([, value]) => isMergePatch || value !== null,
      ),
    );
    setFields.updatedBy = username;
    const queryFilter = withOCCFilter(filter, unmodifiedSince);
    const updated = await this.policyModel
      .findOneAndUpdate(
        queryFilter,
        { $set: setFields },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updated && unmodifiedSince) {
      const stillExists = await this.policyModel.findOne(filter).exec();
      if (stillExists) {
        throw new PreconditionFailedException(
          `Policy has been modified on the server since ${unmodifiedSince.toUTCString()}.`,
        );
      }
    }

    return updated;
  }

  async remove(filter: FilterQuery<PolicyDocument>): Promise<unknown> {
    Logger.log("Removing policy with filter:", filter);

    return await this.policyModel.findOneAndDelete(filter).exec();
  }

  async updateWhere(ownerGroupList: string, data: Partial<Policy>) {
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

    const setFields = this.flattenToDotPaths(data);

    await Promise.all(
      ownerGroups.map(async (ownerGroup) => {
        const email = userIdentity ? userIdentity.profile.email : user.email;

        try {
          await this.addDefaultPolicy(ownerGroup, [], email, "low");
        } catch (error) {
          throw new InternalServerErrorException(error);
        }

        if (!userIdentity) {
          try {
            // allow all functional users
            return await this.policyModel
              .updateOne(
                { ownerGroup },
                { $set: setFields },
                { runValidators: true },
              )
              .exec();
          } catch (error) {
            throw new InternalServerErrorException(error);
          }
        } else {
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

          try {
            return await this.policyModel
              .updateOne(
                { ownerGroup },
                { $set: setFields },
                { runValidators: true },
              )
              .exec();
          } catch (error) {
            throw new InternalServerErrorException(error);
          }
        }
      }),
    );
    return { message: "successful policy update" };
  }

  async addDefaultPolicy(
    ownerGroup: string,
    accessGroups: string[],
    ownerEmail: string,
    tapeRedundancy: string,
    policyUsername: string | null = null,
  ) {
    const policy = await this.policyModel.findOne({ ownerGroup }).exec();

    if (policy) {
      return;
    }

    Logger.log("Adding default policy", "PoliciesService.addDefaultPolicy");

    const defaultManager = this.configService.get<string[]>("defaultManager");
    const defaultPolicy = LEGACY_NOTIFICATION_PIPE.transform({
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
    });

    try {
      await this.create(defaultPolicy, policyUsername);
    } catch (error) {
      throw new InternalServerErrorException(
        error,
        "Error when creating default policy",
      );
    }
  }

  async validatePermission(
    ownerGroup: string,
    email: string,
  ): Promise<boolean> {
    const policy = await this.policyModel.findOne({ ownerGroup }).exec();

    if (!policy) {
      return false;
    }

    if (policy.manager.includes(email)) {
      return true;
    }

    return false;
  }
}
