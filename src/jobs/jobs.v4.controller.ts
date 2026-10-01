import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpStatus,
  HttpException,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { JobClass } from "./schemas/job.schema";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiQuery,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Logger } from "@nestjs/common";
import { FullFacetResponse } from "src/common/types";

import { FilterValidationPipe } from "src/common/pipes/filter-validation.pipe";
import { IncludeValidationPipe } from "./pipes/include-validation.pipe";
import { getSwaggerJobFilterContent } from "./types/jobs-filter-content";
import {
  jobsFullQueryExampleFields,
  jobsFullQueryDescriptionFields,
} from "src/common/utils";
import { JobsControllerUtils } from "./jobs.controller.utils";
import { PartialOutputJobDto } from "./dto/output-job-v4.dto";
import { ALLOWED_JOB_KEYS, ALLOWED_JOB_FILTER_KEYS } from "./types/job-lookup";

@ApiBearerAuth()
@ApiTags("jobs v4")
/* NOTE: Generated SDK method names include "V4" twice:
 *  - From the controller class name (JobsV4Controller)
 *  - From the route version (`version: '4'`)
 * This is intentional for versioned routing.
 */
@Controller({ path: "jobs", version: "4" })
export class JobsV4Controller {
  constructor(
    private readonly jobsService: JobsService,
    private readonly jobsControllerUtils: JobsControllerUtils,
  ) {}

  /**
   * Create job v4
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobCreate, JobClass),
  )
  @Post()
  @ApiOperation({
    summary: "It creates a new job.",
    description: "It creates a new job.",
  })
  @ApiBody({
    description: "Input fields for the job to be created",
    required: true,
    type: CreateJobDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    type: JobClass,
    description: "Created job",
  })
  async create(
    @Req() request: Request,
    @Body() createJobDto: CreateJobDto,
  ): Promise<JobClass | null> {
    return this.jobsControllerUtils.createJob(request, createJobDto);
  }

  /**
   * Update job v4
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobUpdate, JobClass),
  )
  @Patch(":id")
  @ApiOperation({
    summary: "It updates an existing job.",
    description: `It updates the job through the id specified. It updates only the specified fields.
      Set \`content-type\` header to \`application/merge-patch+json\` if you would like to update nested objects.
      
- In \`application/json\`, setting a property to \`null\` means "do not change this value."
- In \`application/merge-patch+json\`, setting a property to \`null\` means "reset this value to \`null\`" (or the default value, if one is defined).

**Caution:** \`application/merge-patch+json\` doesn't support updating a specific item in an array — the result will always replace the entire target if it's not an object.`,
  })
  @ApiConsumes("application/json", "application/merge-patch+json")
  @ApiParam({
    name: "id",
    description: "Id of the job to be modified.",
    type: String,
  })
  @ApiBody({
    description: "Fields for the job to be updated",
    required: true,
    type: UpdateJobDto,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: JobClass,
    description: "Updated job",
  })
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updateJobDto: UpdateJobDto,
  ): Promise<JobClass | null> {
    return await this.jobsControllerUtils.updateJob(request, id, updateJobDto);
  }

  /**
   * Get fullquery v4
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
    name: "filter",
    description:
      "Database filters to apply when retrieving jobs. Use dot-delimited paths (e.g., 'datasets.attachments') to specify fields from related collections.",
    required: false,
    type: String,
    content: getSwaggerJobFilterContent({
      where: true,
      include: false,
      fields: true,
      limits: true,
    }),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [PartialOutputJobDto],
    description: "Return jobs requested.",
  })
  async fullQuery(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(ALLOWED_JOB_KEYS, ALLOWED_JOB_FILTER_KEYS, {
        where: true,
        include: false,
        fields: true,
        limits: true,
      }),
      new IncludeValidationPipe(),
    )
    queryFilter: string,
  ): Promise<PartialOutputJobDto[] | null> {
    return this.jobsControllerUtils.getJobs(request, queryFilter);
  }

  /**
   * Get fullfacet v4
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
      jobsFullQueryDescriptionFields,
    required: false,
    type: String,
    example: jobsFullQueryExampleFields,
  })
  @ApiQuery({
    name: "facets",
    description:
      "Define a list of field names, for which facet counts should be calculated.",
    required: false,
    type: String,
    example: '["type","ownerGroup","statusCode"]',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: FullFacetResponse,
    isArray: true,
    description: "Return fullfacet response for jobs requested.",
  })
  async fullFacet(
    @Req() request: Request,
    @Query() filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    return this.jobsControllerUtils.fullFacetJobs(request, filters);
  }

  /**
   * Get jobs details v4
   */
  @UseGuards(PoliciesGuard)
  @CheckPolicies("jobs", (ability: AppAbility) =>
    ability.can(Action.JobRead, JobClass),
  )
  @Get("/datasetDetails")
  @ApiOperation({
    summary:
      "It returns a list of jobs, datasets in jobParams and datablocks, origdatablocks and attachments.",
    description:
      "It returns a list of jobs. The list returned can be modified by providing a filter.",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Filters to apply when retrieve all jobs. Use dot-delimited paths (e.g., 'datasets.datablocks.size') to specify fields from related collections.",
    required: false,
    type: String,
    content: getSwaggerJobFilterContent({
      where: true,
      include: false,
      fields: true,
      limits: true,
    }),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [PartialOutputJobDto],
    description: "Found jobs",
  })
  async findAllDatasetDetails(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(ALLOWED_JOB_KEYS, ALLOWED_JOB_FILTER_KEYS, {
        where: true,
        include: false,
        fields: true,
        limits: true,
      }),
    )
    queryFilter: string,
  ): Promise<PartialOutputJobDto[]> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");
    // manually add correct include as the only possible for endpoint
    const detailsFilter = {
      ...parsedFilter,
      include: ["datasetDetails"],
    };
    return this.jobsControllerUtils.getJobs(
      request,
      JSON.stringify(detailsFilter),
    );
  }
  /**
   * Get job by id v4
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
  @ApiQuery({
    name: "filter",
    description:
      "Database filters to apply when retrieving jobs. Use dot-delimited paths (e.g., 'datasets.attachments') to specify fields from related collections.",
    required: false,
    type: String,
    content: getSwaggerJobFilterContent({
      where: false,
      include: true,
      fields: true,
      limits: false,
    }),
  })
  @ApiParam({
    name: "id",
    description: "Id of the job to be retrieved.",
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: PartialOutputJobDto,
    description: "Found job",
  })
  async findOne(
    @Req() request: Request,
    @Param("id") id: string,
    @Query(
      "filter",
      new FilterValidationPipe(ALLOWED_JOB_KEYS, ALLOWED_JOB_FILTER_KEYS, {
        where: false,
        include: true,
        fields: true,
        limits: false,
      }),
      new IncludeValidationPipe(),
    )
    queryFilter: string,
  ): Promise<PartialOutputJobDto | null> {
    const parsedFilter = JSON.parse(queryFilter ?? "{}");

    const mergedFilter = {
      ...parsedFilter,
      where: {
        _id: id,
      },
    };
    const job = await this.jobsControllerUtils.getJobByQuery(
      request,
      mergedFilter,
    );
    return job;
  }

  /**
   * Get jobs v4
   * GET /api/v4/jobs
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
    description:
      "Filters to apply when retrieve all jobs. Use dot-delimited paths (e.g., 'datasets.datasetLifecycle') to specify fields from related collections.",
    required: false,
    type: String,
    content: getSwaggerJobFilterContent(),
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: [PartialOutputJobDto],
    description: "Found jobs",
  })
  async findAll(
    @Req() request: Request,
    @Query(
      "filter",
      new FilterValidationPipe(ALLOWED_JOB_KEYS, ALLOWED_JOB_FILTER_KEYS, {
        where: true,
        include: true,
        fields: true,
        limits: true,
      }),
      new IncludeValidationPipe(),
    )
    queryFilter: string,
  ): Promise<PartialOutputJobDto[]> {
    return this.jobsControllerUtils.getJobs(request, queryFilter);
  }

  /**
   * Delete a job v4
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
