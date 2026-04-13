import { HttpService } from "@nestjs/axios";
import {
  Body,
  Controller,
  Delete,
  Get,
  HttpException,
  HttpStatus,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
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
import { Request } from "express";
import { Validator } from "jsonschema";
import { FilterQuery, QueryOptions } from "mongoose";
import { firstValueFrom } from "rxjs";
import { AttachmentsService } from "src/attachments/attachments.service";
import { AllowAny } from "src/auth/decorators/allow-any.decorator";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "src/casl/action.enum";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AuthenticatedPoliciesGuard } from "src/casl/guards/auth-check.guard";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { handleAxiosRequestError } from "src/common/utils";
import { DatasetsService } from "src/datasets/datasets.service";
import { DatasetsV4Controller } from "src/datasets/datasets.v4.controller";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { ProposalsService } from "src/proposals/proposals.service";
import { CreatePublishedDataV4Dto } from "./dto/create-published-data.v4.dto";
import { PartialUpdatePublishedDataV4Dto } from "./dto/update-published-data.v4.dto";
import {
  FormPopulateData,
  ICount,
  IPublishedDataFilters,
  IRegister,
  PublishedDataStatus,
} from "./interfaces/published-data.interface";
import { RegisteredFilterPipe } from "./pipes/registered.pipe";
import { PublishedDataService } from "./published-data.service";
import {
  PublishedData,
  PublishedDataDocument,
} from "./schemas/published-data.schema";
import { V4_FILTER_PIPE } from "./pipes/filter.pipe";
import { ILimitsFilter } from "src/common/interfaces/common.interface";

@ApiBearerAuth()
@ApiTags("published data v4")
/* NOTE: Generated SDK method names include "V4" twice:
 *  - From the controller class name (PublishedDataV4Controller)
 *  - From the route version (`version: '4'`)
 * This is intentional for versioned routing.
 */
@Controller({ path: "publisheddata", version: "4" })
export class PublishedDataV4Controller {
  constructor(
    private readonly attachmentsService: AttachmentsService,
    private readonly configService: ConfigService,
    private readonly datasetsService: DatasetsService,
    private readonly datasetsController: DatasetsV4Controller,
    private readonly httpService: HttpService,
    private readonly proposalsService: ProposalsService,
    private readonly publishedDataService: PublishedDataService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  @AllowAny()
  @Get("config")
  async getConfig(): Promise<Record<string, unknown> | null> {
    return this.publishedDataService.getConfig();
  }

  // POST /publisheddata
  @UseGuards(PoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Create, PublishedData),
  )
  @Post()
  async create(
    @Body() createPublishedDataDto: CreatePublishedDataV4Dto,
  ): Promise<PublishedData> {
    return this.publishedDataService.create(createPublishedDataDto);
  }

  // GET /publisheddata
  @AllowAny()
  @Get()
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieve all published data",
    required: false,
  })
  @ApiQuery({
    name: "limits",
    description: "Database limits to apply when retrieve all published data",
    required: false,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedData,
    isArray: true,
    description: "Results with a published documents array",
  })
  async findAll(
    @Req() request: Request,
    @Query(...V4_FILTER_PIPE, RegisteredFilterPipe)
    filter?: {
      filter: IPublishedDataFilters;
      fields: FilterQuery<PublishedDataDocument>;
      limits: ILimitsFilter;
    },
  ) {
    const publishedDataFilters: IPublishedDataFilters = filter?.filter ?? {};
    const publishedDataLimits: {
      skip?: number;
      limit?: number;
      order?: string;
    } = filter?.limits ?? {};

    if (!publishedDataFilters.limits) {
      publishedDataFilters.limits = publishedDataLimits;
    }

    const ability = this.caslAbilityFactory.publishedDataInstanceAccess(
      request.user as JWTUser,
    );

    if (ability.cannot(Action.accessAny, PublishedData)) {
      publishedDataFilters.where = {
        ...publishedDataFilters.where,
        $or: [
          { status: PublishedDataStatus.PUBLIC },
          { status: PublishedDataStatus.REGISTERED },
          { status: PublishedDataStatus.AMENDED },
          {
            status: PublishedDataStatus.PRIVATE,
            createdBy: (request.user as JWTUser)?.username,
          },
        ],
      };
    }

    return this.publishedDataService.findAll(publishedDataFilters);
  }

  // GET /publisheddata/count
  @AllowAny()
  @Get("/count")
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
    @Req() request: Request,
    @Query(...V4_FILTER_PIPE, RegisteredFilterPipe)
    filter?: {
      filter: IPublishedDataFilters;
      fields: FilterQuery<PublishedDataDocument>;
    },
  ) {
    const jsonFilters: IPublishedDataFilters = filter?.filter ?? {};

    const ability = this.caslAbilityFactory.datasetInstanceAccess(
      request.user as JWTUser,
    );

    if (ability.cannot(Action.accessAny, PublishedData)) {
      jsonFilters.where = {
        ...jsonFilters.where,
        $or: [
          { status: PublishedDataStatus.PUBLIC },
          { status: PublishedDataStatus.REGISTERED },
          { status: PublishedDataStatus.AMENDED },
          {
            status: PublishedDataStatus.PRIVATE,
            createdBy: (request.user as JWTUser)?.username,
          },
        ],
      };
    }

    const options: QueryOptions = {
      limit: jsonFilters?.limits?.limit,
      skip: jsonFilters?.limits?.skip,
    };

    return this.publishedDataService.countDocuments(
      { where: jsonFilters.where },
      options,
    );
  }

  // GET /publisheddata/formpopulate
  @UseGuards(PoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Read, PublishedData),
  )
  @Get("/formpopulate")
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

  getAccessBasedFilters(request: Request, doi: string) {
    const filter: FilterQuery<PublishedData> = {
      doi,
    };
    const ability = this.caslAbilityFactory.publishedDataInstanceAccess(
      request.user as JWTUser,
    );
    if (ability.cannot(Action.accessAny, PublishedData)) {
      filter.$or = [
        { createdBy: (request.user as JWTUser)?.username },
        { status: PublishedDataStatus.REGISTERED },
        { status: PublishedDataStatus.PUBLIC },
        { status: PublishedDataStatus.AMENDED },
      ];
      return filter;
    }

    return filter;
  }

  // GET /publisheddata/:id
  @AllowAny()
  @ApiOperation({
    summary: "It returns the published data requested.",
    description:
      "It returns the published data requested through the id specified.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the published data to return",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedData,
    isArray: false,
    description: "Return published data with id specified",
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: "PublishedData not found",
  })
  @Get("/:id")
  async findOne(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<PublishedData | null> {
    const filter = this.getAccessBasedFilters(request, id);

    const publishedData = await this.publishedDataService.findOne(filter);

    if (!publishedData) {
      throw new NotFoundException(`Published data with doi ${id} not found.`);
    }

    return publishedData;
  }

  // PATCH /publisheddata/:id
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Update, PublishedData),
  )
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedData,
    isArray: false,
    description: "Return updated published data with id specified",
  })
  @Patch("/:id")
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updatePublishedDataDto: PartialUpdatePublishedDataV4Dto,
  ): Promise<PublishedData | null> {
    const filter = this.getAccessBasedFilters(request, id);

    const publishedData = await this.publishedDataService.findOne(filter);
    if (!publishedData) {
      throw new NotFoundException(`Published data with id ${id} not found.`);
    }

    const ability = this.caslAbilityFactory.publishedDataInstanceAccess(
      request.user as JWTUser,
    );

    const canAccessAny = ability.can(Action.accessAny, PublishedData);

    if (canAccessAny) {
      if (
        publishedData.status === PublishedDataStatus.REGISTERED ||
        publishedData.status === PublishedDataStatus.AMENDED
      ) {
        throw new HttpException(
          `Published data with id ${id} is already registered or amended. It cannot be updated.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      if (publishedData.status !== PublishedDataStatus.PRIVATE) {
        throw new HttpException(
          `Published data can only be resynced if it is in ${PublishedDataStatus.PRIVATE} state.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return this.publishedDataService.update(
      { doi: id },
      updatePublishedDataDto,
    );
  }

  // POST /publisheddata/:id/publish
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Update, PublishedData),
  )
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedData,
    isArray: false,
    description: "Return published data with id specified after publishing",
  })
  @Post("/:id/publish")
  async publish(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<PublishedData | null> {
    const filter = this.getAccessBasedFilters(request, id);
    const publishedData = await this.publishedDataService.findOne(filter);

    if (!publishedData) {
      throw new NotFoundException(`Published data with id ${id} not found.`);
    }

    if (publishedData?.status !== PublishedDataStatus.PRIVATE) {
      throw new HttpException(
        `Published data can only be published if it is in ${PublishedDataStatus.PRIVATE} state.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    await this.validateMetadata(publishedData.metadata);

    // Make datasets in publishedData datasetPids array public
    const datasetPids = publishedData.datasetPids;
    await Promise.all(
      datasetPids.map(async (pid) => {
        await this.datasetsController.findByIdAndUpdate(request, pid, {
          isPublished: true,
        });
      }),
    );

    return this.publishedDataService.update(
      { doi: id },
      { status: PublishedDataStatus.PUBLIC },
    );
  }

  // POST /publisheddata/:id/amend
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Update, PublishedData),
  )
  @ApiResponse({
    status: HttpStatus.OK,
    type: PublishedData,
    isArray: false,
    description: "Return amended data with id specified",
  })
  @Post("/:id/amend")
  async amend(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<PublishedData | null> {
    const ability = this.caslAbilityFactory.publishedDataInstanceAccess(
      request.user as JWTUser,
    );

    const canAccessAny = ability.can(Action.accessAny, PublishedData);

    if (!canAccessAny) {
      throw new HttpException(
        "Only admin users can amend published data.",
        HttpStatus.FORBIDDEN,
      );
    }

    const publishedData = await this.publishedDataService.findOne({ doi: id });

    if (!publishedData) {
      throw new NotFoundException(`Published data with id ${id} not found.`);
    }

    if (publishedData?.status !== PublishedDataStatus.REGISTERED) {
      throw new HttpException(
        `Published data can only be amended if it is in ${PublishedDataStatus.REGISTERED} state.`,
        HttpStatus.BAD_REQUEST,
      );
    }

    // TODO: Check if there is any other change needed before amending

    return this.publishedDataService.update(
      { doi: id },
      { status: PublishedDataStatus.AMENDED },
    );
  }

  async validateMetadata(metadata?: object) {
    const validator = new Validator();
    const metadataConfig = await this.getConfig();
    if (!metadataConfig?.metadataSchema) {
      throw new HttpException(
        "Published data schema is not defined in the configuration.",
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }

    const validationResult = validator.validate(
      metadata,
      metadataConfig.metadataSchema,
    );

    if (!validationResult.valid) {
      throw new HttpException(
        validationResult.errors.map((error) => error.stack),
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // DELETE /publisheddata/:id
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Delete, PublishedData),
  )
  @Delete("/:id")
  async remove(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<unknown> {
    const publishedData = await this.publishedDataService.findOne({ doi: id });
    if (!publishedData) {
      throw new NotFoundException(`Published data with id ${id} not found.`);
    }

    const ability = this.caslAbilityFactory.publishedDataInstanceAccess(
      request.user as JWTUser,
    );

    const canAccessAny = ability.can(Action.accessAny, PublishedData);

    if (canAccessAny) {
      if (
        publishedData.status === PublishedDataStatus.REGISTERED ||
        publishedData.status === PublishedDataStatus.AMENDED
      ) {
        throw new HttpException(
          `Published data with id ${id} is already registered or amended. It cannot be removed.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      if (publishedData.status !== PublishedDataStatus.PRIVATE) {
        throw new HttpException(
          `Published data can only be removed if it is in ${PublishedDataStatus.PRIVATE} state.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    return this.publishedDataService.remove({ doi: id });
  }

  // POST /publisheddata/:id/register
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Update, PublishedData),
  )
  @Post("/:id/register")
  async register(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<IRegister | null> {
    const filter = this.getAccessBasedFilters(request, id);
    const publishedData = await this.publishedDataService.findOne(filter);

    if (!publishedData) {
      throw new NotFoundException(`Published data with id ${id} not found.`);
    }

    const data = {
      registeredTime: new Date(),
      status: PublishedDataStatus.REGISTERED,
    };

    publishedData.registeredTime = data.registeredTime;
    publishedData.status = data.status;

    await this.validateMetadata(publishedData.metadata);

    await Promise.all(
      publishedData.datasetPids.map(async (pid) => {
        await this.datasetsController.findByIdAndUpdate(request, pid, {
          isPublished: true,
          datasetlifecycle: { publishedOn: data.registeredTime },
        });
      }),
    );

    const registerDoiUri = this.configService.get<string>("registerDoiUri");
    if (registerDoiUri && registerDoiUri.trim().length > 0) {
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

      const authorization = `${doiProviderCredentials.username}:${doiProviderCredentials.password}`;
      const jsonData = this.doiRegistrationJSON(publishedData);
      const registerDataciteDoiOptions = {
        method: "POST",
        url: `${registerDoiUri}`,
        headers: {
          accept: "application/vnd.api+json",
          "content-type": "application/json",
          authorization: `Basic ${Buffer.from(authorization).toString("base64")}`,
        },
        data: jsonData,
      };

      try {
        await firstValueFrom(
          this.httpService.request(registerDataciteDoiOptions),
        );
      } catch (err) {
        console.log("Error in registerDataciteDoiOptions", err);

        handleAxiosRequestError(err, "PublishedDataController.register");
        throw new HttpException(
          `Error occurred: ${err}`,
          HttpStatus.FAILED_DEPENDENCY,
        );
      }
    }

    const res = await this.publishedDataService.update(
      { doi: publishedData.doi },
      { status: PublishedDataStatus.REGISTERED, registeredTime: new Date() },
    );

    return res;
  }

  // POST /publisheddata/:id/resync
  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("publisheddata", (ability: AppAbility) =>
    ability.can(Action.Update, PublishedData),
  )
  @ApiOperation({
    summary: "Edits published data.",
    description:
      "It edits published data and resyncs with OAI Provider if it is defined.",
  })
  @ApiParam({
    name: "id",
    description: "The DOI of the published data.",
    type: String,
  })
  @ApiBody({
    description:
      "The edited data that will be updated in the database and with OAI Provider if defined.",
    type: PartialUpdatePublishedDataV4Dto,
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
    @Body() data: PartialUpdatePublishedDataV4Dto,
  ): Promise<IRegister | null> {
    const filter = this.getAccessBasedFilters(request, id);

    const publishedData = await this.publishedDataService.findOne(filter);
    if (!publishedData) {
      throw new NotFoundException(`Published data with id ${id} not found.`);
    }

    const ability = this.caslAbilityFactory.publishedDataInstanceAccess(
      request.user as JWTUser,
    );

    const canAccessAny = ability.can(Action.accessAny, PublishedData);

    if (canAccessAny) {
      if (
        publishedData.status === PublishedDataStatus.REGISTERED ||
        publishedData.status === PublishedDataStatus.AMENDED
      ) {
        throw new HttpException(
          `Published data with id ${id} is already registered or amended. It cannot be resynced.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    } else {
      if (publishedData.status !== PublishedDataStatus.PRIVATE) {
        throw new HttpException(
          `Published data can only be resynced if it is in ${PublishedDataStatus.PRIVATE} state.`,
          HttpStatus.BAD_REQUEST,
        );
      }
    }

    const OAIServerUri = this.configService.get<string>("oaiProviderRoute");

    let returnValue = null;
    if (OAIServerUri) {
      returnValue = await this.publishedDataService.resyncOAIPublication(
        id,
        { ...publishedData, ...data },
        OAIServerUri,
      );
    }

    await this.publishedDataService.update({ doi: id }, data);

    return returnValue;
  }

  doiRegistrationJSON(publishedData: PublishedData): object {
    const { title, abstract, metadata, doi } = publishedData;
    const {
      creators,
      contributors,
      resourceType,
      publisher,
      publicationYear,
      subjects,
      descriptions,
      relatedItems,
      relatedIdentifiers,
      language,
      dates,
      sizes,
      formats,
      rightsList,
      geoLocations,
      fundingReferences,
      landingPage,
    } = metadata ?? {};

    const url = landingPage
      ? `https://${landingPage}${encodeURIComponent(doi)}`
      : `${this.configService.get<string>("publicURLprefix")}${encodeURIComponent(doi)}`;

    const descriptionsArray = [
      { description: abstract, descriptionType: "Abstract", lang: "en" },
      ...((descriptions as []) || []),
    ];

    const registrationData = {
      data: {
        type: "dois",
        attributes: {
          event: "publish",
          doi: doi,
          titles: [
            {
              lang: "en",
              title: title,
            },
          ],
          descriptions: descriptionsArray,
          publicationYear: publicationYear,
          subjects: subjects,
          creators: creators,
          publisher: publisher,
          contributors: contributors,
          types: { resourceTypeGeneral: "Dataset", resourceType: resourceType },
          relatedItems: relatedItems,
          relatedIdentifiers: relatedIdentifiers,
          language: language,
          dates: dates,
          sizes: sizes,
          formats: formats,
          rightsList: rightsList,
          geoLocations: geoLocations,
          fundingReferences: fundingReferences,
          url: url,
        },
      },
    };

    return registrationData;
  }
}
