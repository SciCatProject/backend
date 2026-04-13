/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpService } from "@nestjs/axios";
import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Scope,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { InjectModel } from "@nestjs/mongoose";
import { Request } from "express";
import { existsSync, readFileSync } from "fs";
import { FilterQuery, Model } from "mongoose";
import { firstValueFrom } from "rxjs";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import {
  addCreatedByFields,
  handleAxiosRequestError,
  parseLimitFilters,
} from "src/common/utils";
import { CreatePublishedDataV4Dto } from "./dto/create-published-data.v4.dto";
import {
  PartialUpdatePublishedDataV4Dto,
  UpdatePublishedDataV4Dto,
} from "./dto/update-published-data.v4.dto";
import {
  ICount,
  IPublishedDataFilters,
  IRegister,
} from "./interfaces/published-data.interface";
import {
  PublishedData,
  PublishedDataDocument,
} from "./schemas/published-data.schema";

@Injectable({ scope: Scope.REQUEST })
export class PublishedDataService {
  private doiConfigPath = "./src/config/doiconfig.local.json";

  constructor(
    @InjectModel(PublishedData.name)
    private publishedDataModel: Model<PublishedDataDocument>,
    private readonly httpService: HttpService,
    @Inject(REQUEST)
    private request: Request,
    private configService: ConfigService,
  ) {}

  async getConfig(): Promise<Record<string, unknown> | null> {
    const config =
      this.configService.get<Record<string, unknown>>("publishedDataConfig") ||
      null;

    return config;
  }

  async create(
    createPublishedDataDto: CreatePublishedDataV4Dto,
  ): Promise<PublishedData> {
    const username = (this.request.user as JWTUser).username;
    const createdPublished = new this.publishedDataModel(
      addCreatedByFields<CreatePublishedDataV4Dto>(
        createPublishedDataDto,
        username,
      ),
    );

    if (
      createdPublished.metadata &&
      !createdPublished.metadata.publicationYear
    ) {
      createdPublished.metadata.publicationYear = new Date().getFullYear();
    }

    return createdPublished.save();
  }

  async findAll(filter: IPublishedDataFilters): Promise<PublishedData[]> {
    const { limit, skip, sort } = parseLimitFilters(filter.limits);
    return this.publishedDataModel
      .find(filter.where ?? {})
      .limit(limit)
      .skip(skip)
      .sort(sort)
      .select(filter.fields ?? {})
      .exec();
  }

  async countDocuments(
    filter: FilterQuery<PublishedDataDocument>,
    options?: object,
  ): Promise<ICount> {
    const count = await this.publishedDataModel
      .countDocuments(filter.where ?? {}, options)
      .exec();
    return { count };
  }

  async findOne(
    filter: FilterQuery<PublishedDataDocument>,
  ): Promise<PublishedData | null> {
    return this.publishedDataModel.findOne(filter).exec();
  }

  async update(
    filter: FilterQuery<PublishedDataDocument>,
    updatePublishedDataDto: PartialUpdatePublishedDataV4Dto,
  ): Promise<PublishedData | null> {
    const username = (this.request.user as JWTUser).username;
    return this.publishedDataModel
      .findOneAndUpdate(
        filter,
        {
          $set: {
            ...updatePublishedDataDto,
            updatedBy: username,
            updatedAt: new Date(),
          },
        },
        {
          new: true,
          runValidators: true,
        },
      )
      .exec();
  }

  /**
   * Remove a published data document.
   * @param filter - The filter to find the document to remove.
   * @returns The removed document or null if not found.
   */
  async remove(
    filter: FilterQuery<PublishedDataDocument>,
  ): Promise<PublishedData | null> {
    return this.publishedDataModel.findOneAndDelete(filter).exec();
  }

  async resyncOAIPublication(
    id: string,
    publishedData: UpdatePublishedDataV4Dto,
    OAIServerUri: string,
  ): Promise<IRegister | null> {
    let doiProviderCredentials;

    // this can be improved on by validating doiProviderCredentials
    if (existsSync(this.doiConfigPath)) {
      doiProviderCredentials = JSON.parse(
        readFileSync(this.doiConfigPath).toString(),
      );
    } else {
      throw new HttpException(
        "doiConfigPath file not found",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const resyncOAIPublication = {
      method: "PUT",
      body: publishedData,
      json: true,
      uri: OAIServerUri + "/" + encodeURIComponent(encodeURIComponent(id)),
      headers: {
        "content-type": "application/json;charset=UTF-8",
      },
      auth: doiProviderCredentials,
    };

    try {
      const res = await firstValueFrom(
        this.httpService.request({
          ...resyncOAIPublication,
          method: "PUT",
        }),
      );
      return res ? res.data : null;
    } catch (error: any) {
      handleAxiosRequestError(error, "PublishedDataController.resync");
      throw new HttpException(
        `Error occurred: ${error}`,
        error.response?.status || HttpStatus.FAILED_DEPENDENCY,
      );
    }
  }
}
