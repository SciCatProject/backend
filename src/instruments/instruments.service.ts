import {
  Injectable,
  Inject,
  Scope,
  NotFoundException,
  PreconditionFailedException,
} from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model } from "mongoose";
import { IFilters } from "src/common/interfaces/common.interface";
import { CountApiResponse } from "src/common/types";
import {
  parseLimitFilters,
  addCreatedByFields,
  addUpdatedByField,
  createMetadataKeysInstance,
} from "src/common/utils";
import { CreateInstrumentDto } from "./dto/create-instrument.dto";
import { PartialUpdateInstrumentDto } from "./dto/update-instrument.dto";
import { Instrument, InstrumentDocument } from "./schemas/instrument.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { MetadataKeysService } from "src/metadata-keys/metadatakeys.service";
import { withOCCFilter } from "src/datasets/utils/occ-util";

@Injectable({ scope: Scope.REQUEST })
export class InstrumentsService {
  constructor(
    @InjectModel(Instrument.name)
    private instrumentModel: Model<InstrumentDocument>,
    private metadataKeysService: MetadataKeysService,
    @Inject(REQUEST) private request: Request,
  ) {}

  async create(createInstrumentDto: CreateInstrumentDto): Promise<Instrument> {
    const username = (this.request.user as JWTUser).username;
    const createdInstrument = new this.instrumentModel(
      addCreatedByFields<CreateInstrumentDto>(createInstrumentDto, username),
    );
    const savedInstrument = await createdInstrument.save();
    await this.metadataKeysService.insertManyFromSource(
      createMetadataKeysInstance(this.instrumentModel.collection.name, {
        ...savedInstrument.toObject(),
        isPublished: true,
      }),
    );

    return savedInstrument;
  }

  async findAll(filter: IFilters<InstrumentDocument>): Promise<Instrument[]> {
    const whereFilter: FilterQuery<InstrumentDocument> = filter.where ?? {};
    const fieldsProjection: FilterQuery<InstrumentDocument> =
      filter.fields ?? {};
    const { limit, skip, sort } = parseLimitFilters(filter.limits);

    const instrumentPromise = this.instrumentModel
      .find(whereFilter, fieldsProjection)
      .limit(limit)
      .skip(skip)
      .sort(sort);

    const instruments = await instrumentPromise.exec();

    return instruments;
  }

  async count(filter: IFilters<InstrumentDocument>): Promise<CountApiResponse> {
    const whereFilter: FilterQuery<InstrumentDocument> = filter.where ?? {};

    const count = await this.instrumentModel.countDocuments(whereFilter).exec();

    return { count };
  }

  async findOne(
    filter: FilterQuery<InstrumentDocument>,
  ): Promise<Instrument | null> {
    const whereFilter: FilterQuery<InstrumentDocument> = filter.where ?? {};
    const fieldsProjection: FilterQuery<InstrumentDocument> =
      filter.fields ?? {};

    return this.instrumentModel.findOne(whereFilter, fieldsProjection).exec();
  }

  async findOneAndUpdate(
    filter: FilterQuery<InstrumentDocument>,
    updateInstrumentDto: PartialUpdateInstrumentDto,
    unmodifiedSince?: Date,
  ): Promise<Instrument | null> {
    const username = (this.request.user as JWTUser).username;
    const existingInstrument = await this.instrumentModel
      .findOne(filter)
      .exec();

    if (!existingInstrument) {
      throw new NotFoundException(
        `Instrument not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    const queryFilter = withOCCFilter(filter, unmodifiedSince);

    const updatedInstrument = await this.instrumentModel
      .findOneAndUpdate(
        queryFilter,
        {
          $set: {
            ...addUpdatedByField(updateInstrumentDto, username),
            updatedAt: new Date(),
          },
        },
        { new: true, runValidators: true },
      )
      .exec();

    if (!updatedInstrument) {
      if (!unmodifiedSince) {
        throw new NotFoundException(
          `Instrument not found with filter: ${JSON.stringify(filter)}`,
        );
      }
      throw new PreconditionFailedException(
        `Instrument #${filter._id} has been modified on server since ${unmodifiedSince.toUTCString()}`,
      );
    }

    await this.metadataKeysService.replaceManyFromSource(
      createMetadataKeysInstance(this.instrumentModel.collection.name, {
        ...existingInstrument.toObject(),
        isPublished: true,
      }),
      createMetadataKeysInstance(this.instrumentModel.collection.name, {
        ...updatedInstrument.toObject(),
        isPublished: true,
      }),
    );

    return updatedInstrument;
  }

  async remove(filter: FilterQuery<InstrumentDocument>): Promise<unknown> {
    const deletedInstrument = await this.instrumentModel
      .findOneAndDelete(filter)
      .exec();

    if (!deletedInstrument) {
      throw new NotFoundException(
        `Instrument not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    await this.metadataKeysService.deleteMany(
      createMetadataKeysInstance(
        this.instrumentModel.collection.name,
        deletedInstrument,
      ),
    );

    return deletedInstrument;
  }
}
