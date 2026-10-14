import {
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { Model } from "mongoose";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { addCreatedByFields, parseLimitFilters } from "src/common/utils";
import { Policy, PolicyDocument } from "./schemas/policy.schema";
import { IPolicyFilterV4 } from "./interfaces/policy-filters.interface";
import { liveFilter } from "./utils/policy.util";

@Injectable()
export class PoliciesV4Service {
  constructor(
    @InjectModel(Policy.name) private policyModel: Model<PolicyDocument>,
    @Inject(REQUEST) private request: Request,
  ) {}

  async create(createPolicyDto: Partial<Policy>): Promise<PolicyDocument> {
    const username = (this.request.user as JWTUser)?.username;
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

  async findAll(filter: IPolicyFilterV4): Promise<PolicyDocument[]> {
    const whereFilter = liveFilter(filter.where ?? {});
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

  async findOne(id: string): Promise<PolicyDocument> {
    const policy = await this.policyModel
      .findOne(liveFilter({ _id: id }))
      .exec();
    if (!policy) {
      throw new NotFoundException(`Policy not found for id: ${id}`);
    }
    return policy;
  }

  async update(
    id: string,
    updatePolicyDto: Partial<Policy>,
  ): Promise<PolicyDocument> {
    const username = (this.request.user as JWTUser).username;
    const setFields = { ...updatePolicyDto, updatedBy: username };

    const updated = await this.policyModel
      .findOneAndUpdate(
        liveFilter({ _id: id }),
        { $set: setFields },
        { new: true, runValidators: true },
      )
      .exec();
    if (!updated) {
      throw new NotFoundException(`Policy not found for id: ${id}`);
    }
    return updated;
  }

  async remove(id: string): Promise<PolicyDocument> {
    const removed = await this.policyModel
      .findOneAndDelete(liveFilter({ _id: id }))
      .exec();
    if (!removed) {
      throw new NotFoundException(`Policy not found for id: ${id}`);
    }
    return removed;
  }
}
