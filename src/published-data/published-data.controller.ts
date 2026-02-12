/* eslint-disable @typescript-eslint/no-explicit-any */
import { HttpService } from "@nestjs/axios";
import {
  Body,
  ClassSerializerInterceptor,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  SerializeOptions,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { plainToInstance } from "class-transformer";
import { Request } from "express";
import { QueryOptions } from "mongoose";
import { firstValueFrom } from "rxjs";
import { AttachmentsService } from "src/attachments/attachments.service";
import { AllowAny } from "src/auth/decorators/allow-any.decorator";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "src/casl/action.enum";
import { AppAbility } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AuthenticatedPoliciesGuard } from "src/casl/guards/auth-check.guard";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { handleAxiosRequestError } from "src/common/utils";
import { DatasetsService } from "src/datasets/datasets.service";
import { Filter } from "src/datasets/decorators/filter.decorator";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { ProposalsService } from "src/proposals/proposals.service";
import { CreatePublishedDataDto } from "./dto/create-published-data.dto";
import { CreatePublishedDataV4Dto } from "./dto/create-published-data.v4.dto";
import { PublishedDataObsoleteDto } from "./dto/published-data.obsolete.dto";
import {
  PartialUpdatePublishedDataDto,
  UpdatePublishedDataDto,
} from "./dto/update-published-data.dto";
import {
  PartialUpdatePublishedDataV4Dto,
  UpdatePublishedDataV4Dto,
} from "./dto/update-published-data.v4.dto";
import {
  FormPopulateData,
  ICount,
  IPublishedDataFilters,
  IRegister,
  PublishedDataStatus,
} from "./interfaces/published-data.interface";
import { V3_FILTER_PIPE } from "./pipes/filter.pipe";
import {
  IdToDoiPipe,
  RegisteredFilterPipe,
  RegisteredPipe,
} from "./pipes/registered.pipe";
import { PublishedDataService } from "./published-data.service";
import { PublishedData } from "./schemas/published-data.schema";

@ApiBearerAuth()
@ApiTags("published data")
@Controller("publisheddata")
@UseInterceptors(ClassSerializerInterceptor)
export class PublishedDataController {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly configService: ConfigService,
    private readonly datasetsService: DatasetsService,
    private readonly httpService: HttpService,
    private readonly proposalsService: ProposalsService,
    private readonly publishedDataService: PublishedDataService,
  ) {}

  convertObsoleteStatusToCurrent(obsoleteStatus: string): PublishedDataStatus {
    switch (obsoleteStatus) {
      case "registered":
        return PublishedDataStatus.REGISTERED;
      case "pending_registration":
        return PublishedDataStatus.PRIVATE;
      default:
        Logger.error(
          `Unknown PublishedData.status '${obsoleteStatus}' defaulting to PublishedDataStatus.PRIVATE`,
        );
        return PublishedDataStatus.PRIVATE;
    }
  }

  convertObsoleteToCurrentSchema(
    inputObsoletePublishedData:
      | CreatePublishedDataDto
      | UpdatePublishedDataDto
      | PartialUpdatePublishedDataDto,
  ):
    | CreatePublishedDataV4Dto
    | UpdatePublishedDataV4Dto
    | PartialUpdatePublishedDataV4Dto {
    const propertiesModifier: Record<string, any> = {
      metadata: {},
      title: inputObsoletePublishedData.title,
      abstract: inputObsoletePublishedData.abstract,
      datasetPids: inputObsoletePublishedData.pidArray,
    };

    if ("affiliation" in inputObsoletePublishedData) {
      propertiesModifier.metadata.affiliation =
        inputObsoletePublishedData.affiliation;
    }

    if ("publisher" in inputObsoletePublishedData) {
      propertiesModifier.metadata.publisher = {
        name: inputObsoletePublishedData.publisher,
      };
    }

    if ("publicationYear" in inputObsoletePublishedData) {
      propertiesModifier.metadata.publicationYear =
        inputObsoletePublishedData.publicationYear;
    }

    if ("creator" in inputObsoletePublishedData) {
      propertiesModifier.metadata.creators =
        inputObsoletePublishedData.creator?.map((creator) => ({
          name: creator.trim(),
          affiliation: [
            { name: inputObsoletePublishedData.affiliation?.trim() || "" },
          ],
        }));
    }

    if ("dataDescription" in inputObsoletePublishedData) {
      propertiesModifier.metadata.dataDescription =
        inputObsoletePublishedData.dataDescription;
    }

    if ("resourceType" in inputObsoletePublishedData) {
      propertiesModifier.metadata.resourceType =
        inputObsoletePublishedData.resourceType;
    }

    if ("numberOfFiles" in inputObsoletePublishedData) {
      propertiesModifier.metadata.numberOfFiles =
        inputObsoletePublishedData.numberOfFiles;
    }

    if ("sizeOfArchive" in inputObsoletePublishedData) {
      propertiesModifier.metadata.sizeOfArchive =
        inputObsoletePublishedData.sizeOfArchive;
    }

    if ("url" in inputObsoletePublishedData) {
      propertiesModifier.metadata.url = inputObsoletePublishedData.url;
    }

    if ("thumbnail" in inputObsoletePublishedData) {
      propertiesModifier.metadata.thumbnail =
        inputObsoletePublishedData.thumbnail;
    }

    if ("scicatUser" in inputObsoletePublishedData) {
      propertiesModifier.metadata.scicatUser =
        inputObsoletePublishedData.scicatUser;
    }

    if ("downloadLink" in inputObsoletePublishedData) {
      propertiesModifier.metadata.downloadLink =
        inputObsoletePublishedData.downloadLink;
    }

    if ("authors" in inputObsoletePublishedData) {
      propertiesModifier.metadata.contributors =
        inputObsoletePublishedData.authors?.map((author) => ({
          name: author.trim(),
        }));
    }

    if ("relatedPublications" in inputObsoletePublishedData) {
      propertiesModifier.metadata.relatedIdentifiers =
        inputObsoletePublishedData.relatedPublications?.map((publication) => ({
          relatedIdentifier: publication,
        }));
    }

    if ("pidArray" in inputObsoletePublishedData) {
      propertiesModifier.datasetPids = inputObsoletePublishedData.pidArray;
    }

    if (
      "status" in inputObsoletePublishedData &&
      typeof inputObsoletePublishedData.status === "string"
    ) {
      propertiesModifier.status = this.convertObsoleteStatusToCurrent(
        inputObsoletePublishedData.status,
      );
    }

    let outputPublishedData:
      | CreatePublishedDataV4Dto
      | UpdatePublishedDataV4Dto
      | PartialUpdatePublishedDataV4Dto = {};

    if (inputObsoletePublishedData instanceof CreatePublishedDataDto) {
      outputPublishedData = {
        ...propertiesModifier,
      } as CreatePublishedDataV4Dto;
    } else if (inputObsoletePublishedData instanceof UpdatePublishedDataDto) {
      outputPublishedData = {
        ...propertiesModifier,
      } as UpdatePublishedDataV4Dto;
    } else if (
      inputObsoletePublishedData instanceof PartialUpdatePublishedDataDto
    ) {
      outputPublishedData = {
        ...propertiesModifier,
      } as PartialUpdatePublishedDataV4Dto;
    }

    return outputPublishedData;
  }

  // POST /publisheddata
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Create, PublishedData),
  )
  @ApiOperation({
    deprecated: true,
    description:
      "This endpoint is deprecated and v4 endpoints should be used in the future",
  })
  @SerializeOptions({
    type: PublishedDataObsoleteDto,
    excludeExtraneousValues: true,
  })
  @Post()
  async create(
    @Req() request: Request,
    @Body() createPublishedDataDto: CreatePublishedDataDto,
  ): Promise<PublishedDataObsoleteDto> {
    const user: JWTUser = request.user as JWTUser;
    const publishedDataDto = this.convertObsoleteToCurrentSchema(
      createPublishedDataDto,
    ) as CreatePublishedDataV4Dto;

    const createdPublishedData = await this.publishedDataService.create(
      publishedDataDto,
      user.username,
    );

    return createdPublishedData as unknown as PublishedDataObsoleteDto;
  }

  // GET /publisheddata
  @AllowAny()
  @Get()
  @ApiOperation({
    deprecated: true,
    description:
      "This endpoint is deprecated and v4 endpoints should be used in the future",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieve all published data",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedDataObsoleteDto,
    isArray: true,
    description: "Results with a published documents array",
  })
  @SerializeOptions({
    type: PublishedDataObsoleteDto,
    excludeExtraneousValues: true,
  })
  async findAll(
    @Filter(...V3_FILTER_PIPE, RegisteredFilterPipe)
    filter?: {
      filter: IPublishedDataFilters;
    },
  ): Promise<PublishedDataObsoleteDto[]> {
    const publishedDataFilters: IPublishedDataFilters = filter?.filter ?? {};
    const fetchedData =
      await this.publishedDataService.findAll(publishedDataFilters);

    return fetchedData as unknown as PublishedDataObsoleteDto[];
  }

  // GET /publisheddata/count
  @AllowAny()
  @Get("/count")
  @ApiOperation({
    deprecated: true,
    description:
      "This endpoint is deprecated and v4 endpoints should be used in the future",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieve published data count",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: ICount,
    isArray: false,
    description: "Results with a count of the published documents",
  })
  async count(
    @Query(...V3_FILTER_PIPE, RegisteredFilterPipe)
    filter?: {
      filter: IPublishedDataFilters;
    },
  ) {
    const filters: IPublishedDataFilters = filter?.filter ?? {};
    const options: QueryOptions = {
      limit: filters?.limits?.limit,
      skip: filters?.limits?.skip,
    };

    return this.publishedDataService.countDocuments(filters, options);
  }

  // GET /publisheddata/formpopulate
  @UseGuards(PoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Read, PublishedData),
  )
  @Get("/formpopulate")
  @ApiOperation({
    deprecated: true,
    description:
      "This endpoint is deprecated and v4 endpoints should be used in the future",
  })
  @ApiQuery({
    name: "pid",
    description: "Dataset pid used to fetch form data.",
    required: true,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FormPopulateData,
    isArray: false,
    description: "Return form populate data",
  })
  async formPopulate(@Query("pid") pid: string) {
    const formData: FormPopulateData = {};
    const dataset = (await this.datasetsService.findOne({
      where: { pid },
    })) as unknown as DatasetClass;

    let proposalId;
    if (dataset) {
      formData.resourceType = dataset.type;
      formData.description = dataset.description;
      if ("proposalIds" in dataset) {
        proposalId = dataset.proposalIds![0];
      }
    }

    let proposal;
    if (proposalId) {
      proposal = await this.proposalsService.findOne({ proposalId });
    }

    if (proposal) {
      formData.title = proposal.title;
      formData.abstract = proposal.abstract;
    }

    const attachment = await this.attachmentsService.findOne({
      datasetId: pid,
    });

    if (attachment) {
      formData.thumbnail = attachment.thumbnail;
    }

    return formData;
  }

  // GET /publisheddata/:id
  @AllowAny()
  @ApiOperation({
    summary: "It returns the published data requested.",
    description:
      "It returns the published data requested through the id specified. This endpoint is deprecated and v4 endpoints should be used in the future",
    deprecated: true,
  })
  @ApiParam({
    name: "id",
    description: "Id of the published data to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedDataObsoleteDto,
    isArray: false,
    description: "Return published data with id specified",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "PublishedData not found",
  })
  @Get("/:id")
  @SerializeOptions({
    type: PublishedDataObsoleteDto,
    excludeExtraneousValues: true,
  })
  async findOne(
    @Param(new IdToDoiPipe(), RegisteredPipe)
    filter: {
      where: {
        doi: string;
        registered?: string;
      };
    },
  ): Promise<PublishedDataObsoleteDto> {
    const idFilter = filter.where;
    const publishedData = await this.publishedDataService.findOne(idFilter);
    if (!publishedData) {
      throw new NotFoundException(
        `No PublishedData with the id '${idFilter["doi"]}' exists`,
      );
    }

    return publishedData as unknown as PublishedDataObsoleteDto;
  }

  // PATCH /publisheddata/:id
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Update, PublishedData),
  )
  @ApiOperation({
    deprecated: true,
    description:
      "This endpoint is deprecated and v4 endpoints should be used in the future",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedDataObsoleteDto,
    isArray: false,
    description: "Return updated published data",
  })
  @SerializeOptions({
    type: PublishedDataObsoleteDto,
    excludeExtraneousValues: true,
  })
  @Patch("/:id")
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updatePublishedDataDto: PartialUpdatePublishedDataDto,
  ): Promise<PublishedDataObsoleteDto | null> {
    const user = request.user as JWTUser;
    const updateData = this.convertObsoleteToCurrentSchema(
      updatePublishedDataDto,
    );
    const updatedData = await this.publishedDataService.update(
      { doi: id },
      updateData,
      user.username,
    );

    return updatedData as unknown as PublishedDataObsoleteDto;
  }

  // DELETE /publisheddata/:id
  @UseGuards(PoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Delete, PublishedData),
  )
  @ApiOperation({
    deprecated: true,
    description:
      "This endpoint is deprecated and v4 endpoints should be used in the future",
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedDataObsoleteDto,
    isArray: false,
    description: "Return removed published data",
  })
  @SerializeOptions({
    type: PublishedDataObsoleteDto,
    excludeExtraneousValues: true,
  })
  @Delete("/:id")
  async remove(@Param("id") id: string): Promise<PublishedDataObsoleteDto> {
    const removedData = await this.publishedDataService.remove({ doi: id });

    if (!removedData) {
      throw new NotFoundException();
    }

    return removedData as unknown as PublishedDataObsoleteDto;
  }

  // POST /publisheddata/:id/register
  @UseGuards(PoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Update, PublishedData),
  )
  @ApiOperation({
    deprecated: true,
    description:
      "This endpoint is deprecated and v4 endpoints should be used in the future",
  })
  @Post("/:id/register")
  async register(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<IRegister | null> {
    const user = request.user as JWTUser;
    const publishedData = await this.publishedDataService.findOne({ doi: id });

    const publishedDataObsolete = plainToInstance(
      PublishedDataObsoleteDto,
      publishedData,
    );

    if (publishedDataObsolete) {
      const data = {
        registeredTime: new Date(),
        status: "registered",
      };

      publishedDataObsolete.registeredTime = data.registeredTime;
      publishedDataObsolete.status = data.status;

      const xml = formRegistrationXML(publishedDataObsolete);

      await Promise.all(
        publishedDataObsolete.pidArray.map(async (pid) => {
          await this.datasetsService.findByIdAndUpdate(pid, {
            isPublished: true,
            datasetlifecycle: { publishedOn: data.registeredTime },
          });
        }),
      );
      const fullDoi = publishedDataObsolete.doi;
      const registerMetadataUri = this.configService.get<string>(
        "registerMetadataUri",
      );
      const registerDoiUri = this.configService.get<string>("registerDoiUriV3");
      const OAIServerUri = this.configService.get<string>("oaiProviderRoute");

      let doiProviderCredentials = {
        username: "removed",
        password: "removed",
      };

      const username = this.configService.get<string>("doiUsername");
      const password = this.configService.get<string>("doiPassword");

      if (username && password) {
        doiProviderCredentials = {
          username,
          password,
        };
      }

      const registerDataciteMetadataOptions = {
        method: "PUT",
        data: xml,
        url: `${registerMetadataUri}/${fullDoi}`,
        headers: {
          "content-type": "application/xml;charset=UTF-8",
        },
        auth: doiProviderCredentials,
      };

      const encodeDoi = encodeURIComponent(encodeURIComponent(fullDoi)); //Needed to make sure that the "/" between DOI prefix and ID stays encoded in datacite
      const registerDataciteDoiOptions = {
        method: "PUT",
        data: `#Content-Type:text/plain;charset=UTF-8\ndoi= ${fullDoi}\nurl=${this.configService.get<string>(
          "publicURLprefix",
        )}${encodeDoi}`,
        url: `${registerDoiUri}/${fullDoi}`,
        headers: {
          "content-type": "text/plain;charset=UTF-8",
        },
        auth: doiProviderCredentials,
      };

      const syncOAIPublication = {
        method: "POST",
        body: publishedData,
        json: true,
        uri: OAIServerUri,
        headers: {
          "content-type": "application/json;charset=UTF-8",
        },
        auth: doiProviderCredentials,
      };

      if (this.configService.get<string>("site") !== "PSI") {
        console.log("posting to datacite");
        console.log(registerDataciteMetadataOptions);
        console.log(registerDataciteDoiOptions);

        let res;
        try {
          res = await firstValueFrom(
            this.httpService.request({
              ...registerDataciteMetadataOptions,
              method: "PUT",
            }),
          );
        } catch (err: any) {
          handleAxiosRequestError(err, "PublishedDataController.register");
          throw new HttpException(
            `Error occurred: ${err}`,
            err.response?.status || HttpStatus.FAILED_DEPENDENCY,
          );
        }

        try {
          await firstValueFrom(
            this.httpService.request({
              ...registerDataciteDoiOptions,
              method: "PUT",
            }),
          );
        } catch (err: any) {
          handleAxiosRequestError(err, "PublishedDataController.register");
          throw new HttpException(
            `Error occurred: ${err}`,
            err.response?.status || HttpStatus.FAILED_DEPENDENCY,
          );
        }

        try {
          await this.publishedDataService.update(
            { doi: publishedDataObsolete.doi },
            data,
            user.username,
          );
        } catch (error) {
          console.error(error);
        }

        return res ? { doi: res.data } : null;
      } else if (!this.configService.get<string>("oaiProviderRoute")) {
        try {
          await this.publishedDataService.update(
            { doi: publishedDataObsolete.doi },
            data,
            user.username,
          );
        } catch (error) {
          console.error(error);
        }

        console.warn(
          "results not pushed to oaiProvider as oaiProviderRoute route is not specified in the env variables",
        );

        throw new HttpException(
          "results not pushed to oaiProvider as oaiProviderRoute route is not specified in the env variables",
          HttpStatus.OK,
        );
      } else {
        let res;
        try {
          res = await firstValueFrom(
            this.httpService.request({
              ...syncOAIPublication,
              method: "POST",
            }),
          );
        } catch (err: any) {
          handleAxiosRequestError(err, "PublishedDataController.register");
          throw new HttpException(
            `Error occurred: ${err}`,
            err.response?.status || HttpStatus.FAILED_DEPENDENCY,
          );
        }

        try {
          await this.publishedDataService.update(
            { doi: publishedDataObsolete.doi },
            data,
            user.username,
          );
        } catch (error) {
          console.error(error);
        }

        return res ? { doi: res.data } : null;
      }
    }

    throw new NotFoundException();
  }

  // POST /publisheddata/:id/resync
  @UseGuards(PoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Update, PublishedData),
  )
  @ApiOperation({
    summary: "Edits published data",
    description:
      "It edits published data and resyncs with OAI Provider if it is defined. This endpoint is deprecated and v4 endpoints should be used in the future",
    deprecated: true,
  })
  @ApiParam({
    name: "id",
    description: "The DOI of the published data.",
    type: String,
  })
  @ApiBody({
    description:
      "The edited data that will be updated in the database and with OAI Provider if defined.",
    type: UpdatePublishedDataDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    isArray: false,
    description:
      "Return the result of resync with OAI Provider if defined, or null.",
  })
  @Post("/:id/resync")
  async resync(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() data: UpdatePublishedDataDto,
  ): Promise<IRegister | null> {
    const user = request.user as JWTUser;
    const { ...obsolettePublishedData } = data;

    const publishedData = this.convertObsoleteToCurrentSchema(
      obsolettePublishedData,
    );

    const OAIServerUri = this.configService.get<string>("oaiProviderRoute");

    let returnValue = null;
    if (OAIServerUri) {
      returnValue = await this.publishedDataService.resyncOAIPublication(
        id,
        publishedData as UpdatePublishedDataV4Dto,
        OAIServerUri,
      );
    }

    try {
      await this.publishedDataService.update(
        { doi: id },
        publishedData,
        user.username,
      );
    } catch (error: any) {
      throw new HttpException(
        `Error occurred: ${error}`,
        error.response?.status || HttpStatus.FAILED_DEPENDENCY,
      );
    }

    return returnValue;
  }
}

function formRegistrationXML(publishedData: PublishedDataObsoleteDto): string {
  const {
    affiliation,
    publisher,
    publicationYear,
    title,
    abstract,
    resourceType,
    creator,
  } = publishedData;
  const doi = publishedData.doi;
  const uniqueCreator = creator.filter(
    (author, i) => creator.indexOf(author) === i,
  );

  const creatorElements = uniqueCreator.map((author) => {
    const names = author.split(" ");
    const firstName = names[0];
    const lastName = names.slice(1).join(" ");

    return `
            <creator>
                <creatorName>${lastName}, ${firstName}</creatorName>
                <givenName>${firstName}</givenName>
                <familyName>${lastName}</familyName>
                <affiliation>${affiliation}</affiliation>
            </creator>
        `;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
        <resource xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns="http://datacite.org/schema/kernel-4" xsi:schemaLocation="http://datacite.org/schema/kernel-4 https://schema.datacite.org/meta/kernel-4.4/metadata.xsd">
            <identifier identifierType="doi">${doi}</identifier>
            <creators>
                ${creatorElements.join("\n")}
            </creators>
            <titles>
                <title>${title}</title>
            </titles>
            <publisher>${publisher}</publisher>
            <publicationYear>${publicationYear}</publicationYear>
            <descriptions>
                <description xml:lang="en-us" descriptionType="Abstract">${abstract}</description>
            </descriptions>
            <resourceType resourceTypeGeneral="Dataset">${resourceType}</resourceType>
        </resource>
    `;
}
