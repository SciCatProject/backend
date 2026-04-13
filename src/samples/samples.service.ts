import { Injectable, Inject, Scope } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, QueryOptions } from "mongoose";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { IFilters } from "src/common/interfaces/common.interface";
import {
  addCreatedByFields,
  addUpdatedByField,
  createFullqueryFilter,
  extractMetadataKeys,
  parseLimitFilters,
} from "src/common/utils";
import { CreateSampleDto } from "./dto/create-sample.dto";
import { PartialUpdateSampleDto } from "./dto/update-sample.dto";
import { ISampleFields } from "./interfaces/sample-filters.interface";
import { SampleClass, SampleDocument } from "./schemas/sample.schema";
import { CountApiResponse } from "src/common/types";

@Injectable({ scope: Scope.REQUEST })
export class SamplesService {
  constructor(
    @InjectModel(SampleClass.name) private sampleModel: Model<SampleDocument>,
    private configService: ConfigService,
    @Inject(REQUEST) private request: Request,
  ) {}

  async create(createSampleDto: CreateSampleDto): Promise<SampleClass> {
    const username = (this.request.user as JWTUser).username;
    const createdSample = new this.sampleModel(
      addCreatedByFields(createSampleDto, username),
    );

    return createdSample.save();
  }

  async findAll(
    filter: IFilters<SampleDocument, ISampleFields>,
  ): Promise<SampleClass[]> {
    const whereFilter: FilterQuery<SampleDocument> = filter.where ?? {};
    const { limit, skip, sort } = parseLimitFilters(filter.limits);

    return this.sampleModel
      .find(whereFilter)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .exec();
  }

  async count(
    filter: IFilters<SampleDocument, ISampleFields>,
  ): Promise<CountApiResponse> {
    const filterQuery: FilterQuery<SampleDocument> =
      createFullqueryFilter<SampleDocument>(
        this.sampleModel,
        "sampleId",
        filter.fields,
      );

    const count = await this.sampleModel.countDocuments(filterQuery).exec();

    return { count };
  }

  async fullquery(
    filter: IFilters<SampleDocument, ISampleFields>,
  ): Promise<SampleClass[]> {
    const filterQuery: FilterQuery<SampleDocument> =
      createFullqueryFilter<SampleDocument>(
        this.sampleModel,
        "sampleId",
        filter.fields,
      );
    const modifiers: QueryOptions = parseLimitFilters(filter.limits);

    return this.sampleModel.find(filterQuery, null, modifiers).exec();
  }

  async metadataKeys(
    filters: IFilters<SampleDocument, ISampleFields>,
  ): Promise<string[]> {
    const blacklist = [new RegExp(".*_date")];

    let MAXLIMIT;
    if (this.configService.get<number>("metadataParentInstancesReturnLimit")) {
      MAXLIMIT = this.configService.get<number>(
        "metadataParentInstancesReturnLimit",
      );

      let lm;

      if (filters.limits) {
        lm = JSON.parse(JSON.stringify(filters.limits));
      } else {
        lm = {};
      }

      if (MAXLIMIT && lm.limit) {
        if (lm.limit > MAXLIMIT) {
          lm.limit = MAXLIMIT;
        }
      } else {
        lm.limit = MAXLIMIT;
      }
      filters.limits = lm;
    }

    const samples = await this.findAll(filters);

    const metadataKeys = extractMetadataKeys<SampleClass>(
      samples,
      "sampleCharacteristics",
    ).filter((key) => !blacklist.some((regex) => regex.test(key)));

    const metadataKey: string | undefined = filters.fields
      ? filters.fields.metadataKey
      : undefined;
    const returnLimit = this.configService.get<number>(
      "metadataKeysReturnLimit",
    );

    if (metadataKey && metadataKey.length > 0) {
      const filterKey = metadataKey.toLowerCase();
      return metadataKeys
        .filter((key) => key.toLowerCase().includes(filterKey))
        .slice(0, returnLimit);
    } else {
      return metadataKeys.slice(0, returnLimit);
    }
  }

  async findOne(filter: FilterQuery<SampleDocument>) {
    return this.sampleModel.findOne(filter).exec();
  }

  async update(
    filter: FilterQuery<SampleDocument>,
    updateSampleDto: PartialUpdateSampleDto,
  ): Promise<SampleClass | null> {
    const username = (this.request.user as JWTUser).username;
    const updateData = addUpdatedByField(updateSampleDto, username);

    const updateDataMongoose = {
      ...updateData,
      updatedBy: username,
      updatedAt: new Date(),
    };

    return this.sampleModel
      .findOneAndUpdate(
        filter,
        { $set: updateDataMongoose },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async remove(filter: FilterQuery<SampleDocument>): Promise<unknown> {
    return this.sampleModel.findOneAndDelete(filter).exec();
  }
}
