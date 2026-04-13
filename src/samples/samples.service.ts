import { Injectable, Inject, Scope, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, QueryOptions, UpdateQuery } from "mongoose";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { IFilters } from "src/common/interfaces/common.interface";
import {
  addCreatedByFields,
  addUpdatedByField,
  createFullqueryFilter,
  extractMetadataKeys,
  parseLimitFilters,
  decodeMetadataKeyStrings,
} from "src/common/utils";
import { CreateSampleDto } from "./dto/create-sample.dto";
import { PartialUpdateSampleDto } from "./dto/update-sample.dto";
import { ISampleFields } from "./interfaces/sample-filters.interface";
import { SampleClass, SampleDocument } from "./schemas/sample.schema";
import { CountApiResponse } from "src/common/types";
import { OutputSampleDto } from "./dto/output-sample.dto";
import {
  MetadataKeysService,
  MetadataSourceDoc,
} from "src/metadata-keys/metadatakeys.service";

@Injectable({ scope: Scope.REQUEST })
export class SamplesService {
  constructor(
    @InjectModel(SampleClass.name) private sampleModel: Model<SampleDocument>,
    private configService: ConfigService,
    private metadataKeysService: MetadataKeysService,
    @Inject(REQUEST) private request: Request,
  ) {}

  private createMetadataKeysInstance(
    doc: UpdateQuery<SampleDocument>,
  ): MetadataSourceDoc {
    const source: MetadataSourceDoc = {
      sourceType: "sample",
      sourceId: doc.sampleId,
      ownerGroup: doc.ownerGroup,
      accessGroups: doc.accessGroups || [],
      isPublished: doc.isPublished || false,
      metadata: doc.sampleCharacteristics ?? {},
    };
    return source;
  }

  async create(createSampleDto: CreateSampleDto): Promise<SampleClass> {
    const username = (this.request.user as JWTUser).username;
    const createdSample = new this.sampleModel(
      addCreatedByFields(createSampleDto, username),
    );
    const savedSample = await createdSample.save();

    this.metadataKeysService.insertManyFromSource(
      this.createMetadataKeysInstance(savedSample),
    );

    return savedSample;
  }

  async findAll(
    filter: IFilters<SampleDocument, ISampleFields>,
  ): Promise<OutputSampleDto[]> {
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
  ): Promise<OutputSampleDto[]> {
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

    const whereFilter: FilterQuery<SampleDocument> = filters.where ?? {};
    const { limit, skip, sort } = parseLimitFilters(filters.limits);

    const samples = await this.sampleModel
      .find(whereFilter)
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .exec();

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

    const decodedKeys = decodeMetadataKeyStrings(metadataKeys);

    if (metadataKey && metadataKey.length > 0) {
      const filterKey = metadataKey.toLowerCase();
      return decodedKeys
        .filter((key) => key.toLowerCase().includes(filterKey))
        .slice(0, returnLimit);
    } else {
      return decodedKeys.slice(0, returnLimit);
    }
  }

  async findOne(filter: FilterQuery<SampleDocument>) {
    return this.sampleModel.findOne(filter).exec();
  }

  async update(
    filter: FilterQuery<SampleDocument>,
    updateSampleDto: PartialUpdateSampleDto,
  ): Promise<OutputSampleDto | null> {
    const username = (this.request.user as JWTUser).username;
    const updateData = addUpdatedByField(updateSampleDto, username);

    const updateDataMongoose = {
      ...updateData,
      updatedBy: username,
      updatedAt: new Date(),
    };

    const updatedSample = await this.sampleModel
      .findOneAndUpdate(
        filter,
        { $set: updateDataMongoose },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedSample) {
      throw new NotFoundException(
        `Sample not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    await this.metadataKeysService.replaceManyFromSource(
      this.createMetadataKeysInstance(updatedSample),
    );

    return updatedSample;
  }

  async remove(filter: FilterQuery<SampleDocument>): Promise<unknown> {
    const deletedSample = await this.sampleModel
      .findOneAndDelete(filter)
      .exec();

    if (!deletedSample) {
      throw new NotFoundException(
        `Sample not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    this.metadataKeysService.deleteMany({
      sourceType: "sample",
      sourceId: deletedSample.sampleId,
    });
    return deletedSample;
  }
}
