import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  Query,
  HttpStatus,
  HttpException,
  Req,
  SerializeOptions,
  ClassSerializerInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { CreateJobDtoV3 } from "./dto/create-job.v3.dto";
import { UpdateJobDtoV3 } from "./dto/update-job.v3.dto";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { JobClass } from "./schemas/job.schema";
import { OutputJobV3Dto } from "./dto/output-job-v3.dto";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Logger } from "@nestjs/common";
import { FullFacetResponse } from "src/common/types";
import {
  fullQueryDescriptionLimits,
  fullQueryExampleLimits,
  jobsFullQueryDescriptionFieldsV3,
  jobsFullQueryExampleFieldsV3,
} from "src/common/utils";
import { CreateJobV3MappingInterceptor } from "./interceptors/create-job-v3-mapping.interceptor";
import { UpdateJobV3MappingInterceptor } from "./interceptors/update-job-v3-mapping.interceptor";
import { JobsControllerUtils } from "./jobs.controller.utils";
import { getSwaggerJobFilterContent } from "./types/jobs-filter-content";
import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import { IncludeValidationPipe } from "./pipes/include-validation.pipe";
import { DatasetLookupKeysEnum } from "src/datasets/types/dataset-lookup";
import { PartialOutputDatasetDto } from "src/datasets/dto/output-dataset.dto";
import { ALLOWED_JOB_KEYS, ALLOWED_JOB_FILTER_KEYS } from "./types/job-lookup";
import {
  V3_WHERE_TO_V4_PIPE,
  V3_FIELDS_TO_V4_PIPE,
  V3_FILTER_TO_V4_PIPE,
  V3_ORDER_TO_V4_PIPE,
} from "./pipes/v3-filter.pipe";

@ApiBearerAuth()
@ApiTags("jobs")
@Controller({ path: "jobs", version: "3" })
@UseInterceptors(ClassSerializerInterceptor)
export class JobsController {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobsControllerUtils: JobsControllerUtils,
  ) {}

  /**
   * Create job v3
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobCreate, JobClass),
  )
  @UseInterceptors(CreateJobV3MappingInterceptor)
  @Post()
  @ApiOperation({
    summary: "It creates a new job.",
    description: "It creates a new job.",
  })
  @ApiBody({
    description: "Input fields for the job to be created.",
    required: true,
    type: CreateJobDtoV3,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: OutputJobV3Dto,
    description: "Created job",
  })
  @SerializeOptions({ type: OutputJobV3Dto, excludeExtraneousValues: true })
  async create(
    @Req() request: Request,
    @Body() createJobDto: CreateJobDto,
  ): Promise<OutputJobV3Dto | null> {
    const job = await this.jobsControllerUtils.createJob(request, createJobDto);
    return job as OutputJobV3Dto | null;
  }

  /**
   * Update job v3
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobUpdate, JobClass),
  )
  @UseInterceptors(UpdateJobV3MappingInterceptor)
  @Patch(":id")
  @ApiOperation({
    summary: "It updates an existing job.",
    description: "It updates an existing job.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the job to be modified.",
    type: String,
  })
  @ApiBody({
    description: "Fields for the job to be updated",
    required: true,
    type: UpdateJobDtoV3,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputJobV3Dto,
    description: "Updated job",
  })
  @SerializeOptions({ type: OutputJobV3Dto, excludeExtraneousValues: true })
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<OutputJobV3Dto | null> {
    Logger.log("Updating job v3 ", id);
    const updatedJob = await this.jobsControllerUtils.updateJob(
      request,
      id,
      updateJobDto,
    );
    return updatedJob as OutputJobV3Dto | null;
  }

  /**
   * Get fullquery v3
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobRead, JobClass),
  )
  @Get("/fullquery")
  @ApiOperation({
    summary: "It returns a list of jobs matching the query provided.",
    description: "It returns a list of jobs matching the query provided.",
  })
  @ApiQuery({
    name: "fields",
    description:
      "Filters to apply when retrieving jobs.\n" +
      jobsFullQueryDescriptionFieldsV3,
    required: false,
    type: String,
    example: jobsFullQueryExampleFieldsV3,
  })
  @ApiQuery({
    name: "limits",
    description:
      "Define further query parameters like skip, limit, order.\n" +
      fullQueryDescriptionLimits,
    required: false,
    type: String,
    example: fullQueryExampleLimits,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [OutputJobV3Dto],
    description: "Return jobs requested.",
  })
  @SerializeOptions({ type: OutputJobV3Dto, excludeExtraneousValues: true })
  async fullQuery(
    @Req() request: Request,
    @Query("fields", ...V3_WHERE_TO_V4_PIPE) fields?: string,
    @Query("limits", ...V3_ORDER_TO_V4_PIPE) limits?: string,
  ): Promise<OutputJobV3Dto[] | null> {
    const jobs = (await this.jobsControllerUtils.fullQueryJobs(request, {
      fields,
      limits,
    })) as JobClass[] | null;
    return jobs as OutputJobV3Dto[] | null;
  }

  /**
   * Get fullfacet v3
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobRead, JobClass),
  )
  @Get("/fullfacet")
  @ApiOperation({
    summary: "It returns a list of job facets matching the filter provided.",
    description:
      "It returns a list of job facets matching the filter provided.",
  })
  @ApiQuery({
    name: "fields",
    description:
      "Define the filter conditions by specifying the values of fields requested.\n" +
      jobsFullQueryDescriptionFieldsV3,
    required: false,
    type: String,
    example: jobsFullQueryExampleFieldsV3,
  })
  @ApiQuery({
    name: "facets",
    description:
      "Define a list of field names, for which facet counts should be calculated.",
    required: false,
    type: String,
    example: '["type","ownerGroup","jobStatusMessage"]',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FullFacetResponse,
    isArray: true,
    description: "Return fullfacet response for jobs requested.",
  })
  async fullFacet(
    @Req() request: Request,
    @Query("facets", ...V3_FIELDS_TO_V4_PIPE) facets?: string,
    @Query("fields", ...V3_WHERE_TO_V4_PIPE) fields?: string,
  ): Promise<Record<string, unknown>[]> {
    return this.jobsControllerUtils.fullFacetJobs(request, { facets, fields });
  }

  /**
   * Get datasetDetails of a job by id v3
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobRead, JobClass),
  )
  @Get("datasetDetails")
  @ApiOperation({
    summary: "It returns datasetDetails of the requested job.",
    description:
      "This endpoint is compatible with legacy backend and returns the dataset details associated with the specified jobId",
  })
  @ApiQuery({
    name: "jobId",
    description: "Id of the job to retrieve dataset details for.",
    required: true,
    type: String,
  })
  @ApiQuery({
    name: "datasetFields",
    description:
      "JSON-encoded object specifying which dataset fields to include.",
    required: false,
    type: String,
    example: JSON.stringify({
      pid: true,
      sourceFolder: true,
      sourceFolderHost: true,
      contactEmail: true,
      owner: true,
      ownerGroup: true,
      classification: true,
      type: true,
      datasetlifecycle: true,
      createdBy: true,
    }),
  })
  @ApiQuery({
    name: "include",
    description: "JSON-encoded include filter (e.g., relation to datablocks).",
    required: false,
    type: String,
    example: JSON.stringify({ relation: "datablocks" }),
  })
  @ApiQuery({
    name: "includeFields",
    description: "JSON-encoded object specifying fields of included relations.",
    required: false,
    type: String,
    example: JSON.stringify({
      id: true,
      archiveId: true,
      size: true,
      datasetId: true,
    }),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [PartialOutputDatasetDto],
    description: "Found dataset details",
  })
  async findOneDetails(
    @Req() request: Request,
    @Query("jobId") jobId: string,
    @Query("datasetFields") datasetFields?: string,
    @Query("include") include?: string,
    @Query("includeFields") includeFields?: string,
  ): Promise<PartialOutputDatasetDto[] | null> {
    let parsedDatasetFields: Record<string, boolean> | undefined;
    let parsedInclude: Record<string, DatasetLookupKeysEnum> | undefined;
    let parsedIncludeFields: Record<string, boolean> | undefined;
    try {
      parsedDatasetFields = datasetFields
        ? JSON.parse(datasetFields)
        : undefined;
      parsedInclude = include ? JSON.parse(include) : undefined;
      parsedIncludeFields = includeFields
        ? JSON.parse(includeFields)
        : undefined;
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: (e as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    const fieldArray: string[] = [];
    for (const [k, v] of Object.entries(parsedDatasetFields ?? {})) {
      if (v) {
        if (
          parsedInclude &&
          typeof parsedInclude === "object" &&
          Object.keys(parsedInclude).length > 0
        ) {
          fieldArray.push(`datasetDetails.${k}`);
        } else {
          fieldArray.push(`datasets.${k}`);
        }
      }
    }
    let includeArray: string[] = [];
    if (
      parsedInclude &&
      typeof parsedInclude === "object" &&
      "relation" in parsedInclude &&
      typeof parsedInclude.relation === "string"
    ) {
      includeArray = ["datasetDetails"];
      for (const [k, v] of Object.entries(parsedIncludeFields ?? {})) {
        if (v) {
          fieldArray.push(`datasetDetails.${parsedInclude.relation}.${k}`);
        }
      }
    } else {
      includeArray = ["datasets"];
    }

    const mergedFilter = {
      where: {
        _id: jobId,
      },
      include: includeArray,
      fields: fieldArray,
    };
    const job = await this.jobsControllerUtils.getJobByQuery(
      request,
      mergedFilter,
    );
    if (job) {
      if (Object.keys(job).includes("datasetDetails")) {
        return job["datasetDetails"];
      }
      return job["datasets"];
    }
    return null;
  }

  /**
   * Get job by id v3
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobRead, JobClass),
  )
  @Get(":id")
  @ApiOperation({
    summary: "It returns the requested job.",
    description: "It returns the requested job.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the job to be retrieved.",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: OutputJobV3Dto,
    description: "Found job",
  })
  @SerializeOptions({ type: OutputJobV3Dto, excludeExtraneousValues: true })
  async findOne(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<OutputJobV3Dto | null> {
    const job = (await this.jobsControllerUtils.getJobById(
      request,
      id,
    )) as JobClass | null;
    return job as OutputJobV3Dto | null;
  }

  /**
   * Get jobs v3
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobRead, JobClass),
  )
  @Get()
  @ApiOperation({
    summary: "It returns a list of jobs.",
    description:
      "It returns a list of jobs. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving jobs",
    required: false,
    type: String,
    content: getSwaggerJobFilterContent({
      where: true,
      include: false,
      fields: false,
      limits: true,
    }),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [OutputJobV3Dto],
    description: "Found jobs",
  })
  @SerializeOptions({ type: OutputJobV3Dto, excludeExtraneousValues: true })
  async findAll(
    @Req() request: Request,

    @Query(
      "filter",
      ...V3_FILTER_TO_V4_PIPE,
      new FilterValidationPipe(ALLOWED_JOB_KEYS, ALLOWED_JOB_FILTER_KEYS, {
        where: false,
        include: true,
        fields: true,
        limits: false,
      }),
      new IncludeValidationPipe(),
    )
    queryFilter: string,
  ): Promise<OutputJobV3Dto[]> {
    const jobs = (await this.jobsControllerUtils.getJobs(
      request,
      queryFilter,
    )) as unknown as JobClass[] | null;
    return jobs as OutputJobV3Dto[] | [];
  }

  /**
   * Delete a job v3
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobDelete, JobClass),
  )
  @Delete(":id")
  @ApiOperation({
    summary: "It deletes the requested job.",
    description: "It deletes the requested job.",
  })
  @ApiParam({
    name: "id",
    description: "Id of the job to be deleted.",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: undefined,
    description: "Deleted job",
  })
  async remove(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<unknown> {
    const foundJob = await this.jobsService.findOne({ _id: id });
    if (foundJob === null) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: `Job id ${id} doesn't exist.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    Logger.log(`Deleting job with id ${id}!`);
    return this.jobsService.remove({ _id: id });
  }
}
