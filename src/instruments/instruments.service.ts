import { Injectable, Inject, Scope, NotFoundException } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model, UpdateQuery } from "mongoose";
import { IFilters } from "src/common/interfaces/common.interface";
import { CountApiResponse } from "src/common/types";
import {
  parseLimitFilters,
  addCreatedByFields,
  addUpdatedByField,
} from "src/common/utils";
import { CreateInstrumentDto } from "./dto/create-instrument.dto";
import { PartialUpdateInstrumentDto } from "./dto/update-instrument.dto";
import { Instrument, InstrumentDocument } from "./schemas/instrument.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import {
  MetadataKeysService,
  MetadataSourceDoc,
} from "src/metadata-keys/metadatakeys.service";

@Injectable({ scope: Scope.REQUEST })
export class InstrumentsService {
  constructor(
    @InjectModel(Instrument.name)
    private instrumentModel: Model<InstrumentDocument>,
    private metadataKeysService: MetadataKeysService,
    @Inject(REQUEST) private request: Request,
  ) {}

  private createMetadataKeysInstance(
    doc: UpdateQuery<InstrumentDocument>,
  ): MetadataSourceDoc {
    const source: MetadataSourceDoc = {
      sourceType: "instrument",
      sourceId: doc.pid,
      ownerGroup: doc.ownerGroup,
      accessGroups: doc.accessGroups || [],
      isPublished: doc.isPublished || false,
      metadata: doc.customMetadata ?? {},
    };
    return source;
  }

  async create(createInstrumentDto: CreateInstrumentDto): Promise<Instrument> {
    const username = (this.request.user as JWTUser).username;
    const createdInstrument = new this.instrumentModel(
      addCreatedByFields<CreateInstrumentDto>(createInstrumentDto, username),
    );
    const savedInstrument = await createdInstrument.save();

    await this.metadataKeysService.insertManyFromSource(
      this.createMetadataKeysInstance(savedInstrument),
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

  async update(
    filter: FilterQuery<InstrumentDocument>,
    updateInstrumentDto: PartialUpdateInstrumentDto,
  ): Promise<Instrument | null> {
    const username = (this.request.user as JWTUser).username;

    const updatedInstrument = this.instrumentModel
      .findOneAndUpdate(
        filter,
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
      throw new NotFoundException(
        `Instrument not found with filter: ${JSON.stringify(filter)}`,
      );
    }

    await this.metadataKeysService.replaceManyFromSource(
      this.createMetadataKeysInstance(updatedInstrument),
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
      this.createMetadataKeysInstance(deletedInstrument),
    );

    return deletedInstrument;
  }
}
