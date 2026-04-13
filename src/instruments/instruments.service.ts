import { Injectable, Inject, Scope } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model } from "mongoose";
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

@Injectable({ scope: Scope.REQUEST })
export class InstrumentsService {
  constructor(
    @InjectModel(Instrument.name)
    private instrumentModel: Model<InstrumentDocument>,
    @Inject(REQUEST) private request: Request,
  ) {}

  async create(createInstrumentDto: CreateInstrumentDto): Promise<Instrument> {
    const username = (this.request.user as JWTUser).username;
    const createdInstrument = new this.instrumentModel(
      addCreatedByFields<CreateInstrumentDto>(createInstrumentDto, username),
    );
    return createdInstrument.save();
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
    return this.instrumentModel
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
  }

  async remove(filter: FilterQuery<InstrumentDocument>): Promise<unknown> {
    return this.instrumentModel.findOneAndDelete(filter).exec();
  }
}
