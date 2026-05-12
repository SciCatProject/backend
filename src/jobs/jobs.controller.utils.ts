import {
  Injectable,
  HttpStatus,
  HttpException,
  ForbiddenException,
  UnauthorizedException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Request } from "express";
import { Condition, FilterQuery } from "mongoose";
import * as jmp from "json-merge-patch";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { DatasetListDto } from "./dto/dataset-list.dto";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { CreateJobAuth, UpdateJobAuth } from "src/jobs/types/jobs-auth.enum";
import { JobClass, JobDocument } from "./schemas/job.schema";
import { IFacets, IFilters } from "src/common/interfaces/common.interface";
import { DatasetsService } from "src/datasets/datasets.service";
import { JobsConfigSchema } from "./types/jobs-config-schema.enum";
import { OrigDatablocksService } from "src/origdatablocks/origdatablocks.service";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { AccessGroupsType } from "src/config/configuration";
import { Logger } from "@nestjs/common";
import { UsersService } from "src/users/users.service";
import {
  JobConfig,
  validateActions,
  performActions,
} from "../config/job-config/jobconfig.interface";
import { JobParams } from "./types/job-types.enum";
import { IJobFields } from "./interfaces/job-filters.interface";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { ConfigService } from "@nestjs/config";
import { JobConfigService } from "../config/job-config/jobconfig.service";
import { mandatoryFields } from "./types/jobs-filter-content";
import {
  PartialOutputJobDto,
  PartialIntermediateOutputJobDto,
} from "./dto/output-job-v4.dto";
import { toObject } from "src/config/job-config/actions/actionutils";
import { loadDatasets } from "src/config/job-config/actions/actionutils";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";

@Injectable()
export class JobsControllerUtils {
  jobDatasetAuthorization: Array<string> = [];
  private accessGroups;
  adminGroups: Set<string> = new Set<string>();
  createJobPrivilegedGroups: Set<string> = new Set<string>();

  constructor(
    private readonly jobsService: JobsService,
    private readonly datasetsService: DatasetsService,
    private readonly origDatablocksService: OrigDatablocksService,
    private caslAbilityFactory: CaslAbilityFactory,
    private readonly usersService: UsersService,
    private configService: ConfigService,
    private jobConfigService: JobConfigService,
  ) {
    this.jobDatasetAuthorization = Object.values(CreateJobAuth).filter((v) =>
      v.includes("#dataset"),
    );
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
    this.adminGroups = new Set(this.accessGroups?.admin ?? []);
    this.createJobPrivilegedGroups = new Set(
      this.accessGroups?.createJobPrivileged ?? [],
    );
  }

  /**
   * Check that jobParams.datasetList is of valid type and contains valid values
   */
  async validateDatasetList(
    jobParams: Record<string, unknown>,
  ): Promise<DatasetListDto[]> {
    const datasetList = jobParams[
      JobParams.DatasetList
    ] as Array<DatasetListDto>;
    // check that datasetList is a non empty array
    if (!Array.isArray(datasetList))
      throw new UnprocessableEntityException("Invalid dataset list");
    if (datasetList.length == 0)
      throw new UnprocessableEntityException(
        "List of passed datasets is empty.",
      );

    // check that datasetList is of type DatasetListDto[]
    const datasetListDtos: DatasetListDto[] = plainToInstance(
      DatasetListDto,
      datasetList,
    );
    const nestedErrors = await Promise.all(
      datasetListDtos.map((dto) => validate(dto)),
    );
    const validateErrors = nestedErrors.flat();
    if (validateErrors.length > 0) {
      const minimalErrors = validateErrors.map(({ property, constraints }) => ({
        property,
        constraints,
      }));
      throw new UnprocessableEntityException(
        "Invalid dataset list. " + JSON.stringify(minimalErrors),
      );
    }

    // check that all requested pids exist
    await this.checkDatasetPids(datasetListDtos);
    // check that all requested files exist
    await this.checkDatasetFiles(datasetListDtos);

    return datasetListDtos;
  }

  /**
   * Check that the dataset pids are valid
   */
  async checkDatasetPids(datasetList: DatasetListDto[]): Promise<void> {
    const datasetIds = datasetList.map((x) => x.pid);
    const filter: FilterQuery<DatasetClass> = {
      where: {
        pid: { $in: datasetIds },
      },
      fields: ["pid"],
    };

    const datasets = await this.datasetsService.findAll(filter);
    const findIds = new Set(datasets.map(({ pid }) => pid));
    const nonExistIds = datasetIds.filter((x) => !findIds.has(x));

    if (nonExistIds.length == 0) return;
    throw new UnprocessableEntityException(
      `Datasets with pid ${nonExistIds} do not exist.`,
    );
  }

  /**
   * Check that the dataset files are valid
   */
  async checkDatasetFiles(datasetList: DatasetListDto[]): Promise<void> {
    const datasetsToCheck = datasetList.filter((x) => x.files.length > 0);
    const ids = datasetsToCheck.map((x) => x.pid);
    if (ids.length == 0) return;
    // Indexing originDataBlock with pid and create set of files for each dataset
    const datasetOrigDatablocks: OrigDatablock[] =
      await this.origDatablocksService.findAll({
        where: { datasetId: { $in: ids } },
        fields: ["datasetId", "dataFileList.path"],
      });

    const origsMappedByDatasetId = datasetOrigDatablocks.reduce(
      (acc, orig) => {
        const set = (acc[orig.datasetId] ??= new Set<string>());
        orig.dataFileList.forEach((file) => set.add(file.path));
        return acc;
      },
      {} as Record<string, Set<string>>,
    );
    // Get a list of requested files that were not found
    const checkResults = datasetsToCheck
      .map(({ pid, files }) => {
        const referenceFiles = origsMappedByDatasetId[pid] ?? new Set<string>();
        const nonExistFiles = files.filter((f) => !referenceFiles.has(f));
        return { pid, nonExistFiles };
      })
      .filter((result) => result.nonExistFiles.length > 0);

    if (checkResults.length == 0) return;
    throw new UnprocessableEntityException({
      message: "At least one requested file could not be found.",
      error: JSON.stringify(checkResults),
    });
  }

  /**
   * Create instance of JobClass to check permissions
   */
  async generateJobInstanceForPermissions(
    job: PartialIntermediateOutputJobDto | JobClass,
  ): Promise<JobClass> {
    const jobInstance = new JobClass();
    jobInstance._id = job._id;
    jobInstance.id = job.id;
    jobInstance.type = job.type;
    jobInstance.ownerGroup = job.ownerGroup;
    jobInstance.ownerUser = job.ownerUser;
    return jobInstance;
  }

  /**
   * Check job type matching configuration
   */
  getJobTypeConfiguration = (jobType: string) => {
    const jobConfig = this.jobConfigService.get(jobType);
    if (!jobConfig) {
      // return error that job type does not exists
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: "Invalid job type: " + jobType,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return jobConfig;
  };

  private initJobInstance(
    jobCreateDto: CreateJobDto,
    jobConfiguration: JobConfig,
    datasetList: DatasetListDto[],
  ): JobClass {
    const jobInstance = new JobClass();
    jobInstance._id = "";
    jobInstance.accessGroups = [];
    jobInstance.type = jobCreateDto.type;
    if (jobCreateDto.contactEmail)
      jobInstance.contactEmail = jobCreateDto.contactEmail;
    const { jobStatusMessage, ...cleanJobParams } = jobCreateDto.jobParams;
    jobInstance.jobParams = jobStatusMessage
      ? cleanJobParams
      : jobCreateDto.jobParams;
    jobInstance.configVersion =
      jobConfiguration[JobsConfigSchema.ConfigVersion];
    // use jobStatusMessage if provided, otherwise fall back to default
    jobInstance.statusCode =
      (jobStatusMessage as string) ||
      this.configService.get<string>("jobDefaultStatusCode")!;
    jobInstance.statusMessage =
      (jobStatusMessage as string) ||
      this.configService.get<string>("jobDefaultStatusMessage")!;
    if (JobParams.DatasetList in jobCreateDto.jobParams)
      jobInstance.jobParams[JobParams.DatasetList] = datasetList;
    if (jobCreateDto.ownerGroup)
      jobInstance.ownerGroup = jobCreateDto.ownerGroup;
    return jobInstance;
  }

  private isAdminUser(user: JWTUser | null): boolean {
    return !!(user && user.currentGroups.some((g) => this.adminGroups.has(g)));
  }

  private isJobCreationPrivilegedUser(user: JWTUser | null): boolean {
    return !!(
      user &&
      user.currentGroups.some((g) => this.createJobPrivilegedGroups.has(g))
    );
  }

  private isPrivilegedUser(user: JWTUser | null): boolean {
    return this.isAdminUser(user) || this.isJobCreationPrivilegedUser(user);
  }

  /**
   * Checking if user is allowed to create job according to auth field of job configuration
   */
  async instanceAuthorizationJobCreate(
    jobCreateDto: CreateJobDto,
    user: JWTUser,
  ): Promise<JobClass> {
    // NOTE: We need JobClass instance because casl module works only on that.
    // If other fields are needed can be added later.
    const jobConfiguration = this.getJobTypeConfiguration(jobCreateDto.type);
    const datasetList =
      JobParams.DatasetList in jobCreateDto.jobParams
        ? await this.validateDatasetList(jobCreateDto.jobParams)
        : [];
    const jobInstance = this.initJobInstance(
      jobCreateDto,
      jobConfiguration,
      datasetList,
    );
    const jobUser = await this.processJobUser(user, jobCreateDto, jobInstance);
    await this.checkDatasetsAccess(
      jobConfiguration,
      jobCreateDto,
      datasetList,
      user,
      jobUser,
    );
    if (!user && jobCreateDto.ownerGroup)
      throw new ForbiddenException(
        "Invalid new job. Unauthenticated user cannot initiate a job owned by another user.",
      );
    const ability = this.caslAbilityFactory.jobsInstanceAccess(
      user,
      jobConfiguration,
    );
    const canCreate =
      (user?.currentGroups ?? []).some((g) => this.adminGroups.has(g)) ||
      ability.can(Action.JobCreateAny, JobClass) ||
      ability.can(Action.JobCreateOwner, jobInstance) ||
      (ability.can(Action.JobCreateConfiguration, jobInstance) &&
        jobConfiguration.create.auth != CreateJobAuth.JobAdmin);
    if (!canCreate)
      throw new ForbiddenException("Unauthorized to create this job.");
    return jobInstance;
  }

  private async processJobUser(
    user: JWTUser,
    jobCreateDto: CreateJobDto,
    jobInstance: JobClass,
  ) {
    if (!user) return null;
    let jobUser: JWTUser | null = user;
    const userGroups = new Set(user?.currentGroups ?? []);
    if (this.isPrivilegedUser(user)) {
      if (
        !jobCreateDto.ownerGroup &&
        !jobCreateDto.ownerUser &&
        !jobCreateDto.contactEmail
      ) {
        throw new UnprocessableEntityException(
          "Contact email should be specified for an anonymous job.",
        );
      }
      // admin users and users  in CREATE_JOB_PRIVILEGED group can specify any ownerUser
      if (jobCreateDto.ownerUser && jobCreateDto.ownerUser !== user.username) {
        jobUser = await this.usersService.findByUsername2JWTUser(
          jobCreateDto.ownerUser,
        );
        if (jobUser === null)
          Logger.log(
            "Owner user was not found, using current user instead.",
            "instanceAuthorizationJobCreate",
          );
        jobInstance.ownerUser = (jobUser?.username as string) ?? user.username;
      } else if (jobCreateDto.ownerUser) {
        jobInstance.ownerUser = user.username;
      } else jobUser = null;
    } else {
      // non-privileged users can only specify ownerUser as themselves and ownerGroup that they belong to
      if (!jobCreateDto.ownerGroup)
        throw new ForbiddenException(
          "Invalid new job. Owner group should be specified.",
        );
      if (jobCreateDto.ownerUser && jobCreateDto.ownerUser !== user.username)
        throw new ForbiddenException(
          "Invalid new job. User owning the job should match user logged in.",
        );
      if (!userGroups.has(jobCreateDto.ownerGroup))
        throw new ForbiddenException(
          "Invalid new job. User needs to belong to job owner group.",
        );
      jobInstance.ownerUser = user.username;
    }
    jobInstance.contactEmail =
      jobInstance.contactEmail ?? jobUser?.email ?? user.email;
    return jobUser;
  }

  private async checkDatasetsAccess(
    jobConfiguration: JobConfig,
    jobCreateDto: CreateJobDto,
    datasetList: DatasetListDto[],
    user: JWTUser,
    jobUser: JWTUser | null,
  ) {
    if (this.isAdminUser(user)) return;
    if (
      !(
        jobConfiguration.create.auth &&
        Object.values(this.jobDatasetAuthorization).includes(
          jobConfiguration.create.auth,
        )
      )
    )
      return;
    if (!jobCreateDto.jobParams[JobParams.DatasetList])
      throw new UnprocessableEntityException(
        "Dataset ids list was not provided in jobParams",
      );
    const datasetsWhere: { where: Condition<DatasetClass> } = {
      where: {
        pid: { $in: datasetList.map((x) => x.pid) },
      },
    };
    const requestUserGroups = this.isJobCreationPrivilegedUser(user)
      ? (jobUser?.currentGroups ?? [])
      : (user?.currentGroups ?? []);
    if (jobConfiguration.create.auth === CreateJobAuth.DatasetPublic)
      datasetsWhere.where.isPublished = true;
    else if (jobConfiguration.create.auth === CreateJobAuth.DatasetAccess) {
      if (requestUserGroups.length === 0)
        datasetsWhere.where.isPublished = true;
      else
        datasetsWhere.where.$or = [
          { ownerGroup: { $in: requestUserGroups } },
          { accessGroups: { $in: requestUserGroups } },
          { isPublished: true },
        ];
    } else if (jobConfiguration.create.auth === CreateJobAuth.DatasetOwner) {
      if (!user) throw new UnauthorizedException("User not authenticated");
      if (requestUserGroups.length === 0)
        throw new ForbiddenException(
          "User does not belong to any group, cannot create job with #datasetOwner authorization.",
        );
      datasetsWhere.where.ownerGroup = { $in: requestUserGroups };
    } else {
      datasetsWhere.where.isPublished = true;
    }
    const numberOfDatasetsWithAccess =
      await this.datasetsService.count(datasetsWhere);
    if (numberOfDatasetsWithAccess.count < datasetList.length)
      throw new ForbiddenException(
        "User does not have access to all datasets, cannot create job.",
      );
  }

  /**
   * Check for mismatches between the config version used to create the job and the currently loaded version.
   *
   * Currently this is only logged.
   * @param jobInstance
   * @returns
   */
  async checkConfigVersion(
    jobConfig: JobConfig,
    jobInstance: JobClass,
  ): Promise<void> {
    // Give a warning when configVersion does not match
    if (jobConfig.configVersion !== jobInstance.configVersion) {
      Logger.log(
        `
          Job was created with configVersion ${jobInstance.configVersion}.
          Current configVersion is ${jobConfig.configVersion}.
        `,
        "JobUpdate",
      );
    }
  }

  /**
   * Create job implementation
   */
  async createJob(
    request: Request,
    createJobDto: CreateJobDto,
  ): Promise<JobClass | null> {
    Logger.debug("Creating job", "JobsController");
    // Validate that request matches the current configuration
    // Check job authorization
    const jobInstance = await this.instanceAuthorizationJobCreate(
      createJobDto,
      request.user as JWTUser,
    );
    // Allow actions to validate DTO
    const jobConfig = this.getJobTypeConfiguration(createJobDto.type);
    const validateContext = { request: createJobDto, env: process.env };
    const contextWithDatasets = await loadDatasets(
      this.datasetsService,
      validateContext,
    );
    await validateActions(jobConfig.create.actions, contextWithDatasets);
    // Create actual job in database
    const createdJobInstance = await this.jobsService.create(jobInstance);
    // Perform the action that is specified in the create portion of the job configuration
    const performContext = {
      ...contextWithDatasets,
      job: toObject(createdJobInstance) as JobClass,
    };
    await performActions(jobConfig.create.actions, performContext);
    return createdJobInstance;
  }

  /**
   * Update job implementation
   */
  async updateJob(
    request: Request,
    id: string,
    updateJobDto: UpdateJobDto,
  ): Promise<JobClass | null> {
    Logger.log("updating job ", id);
    // Find existing job
    const currentJob = await this.jobsService.findOne({ id: id });
    if (currentJob === null) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: "Invalid job id.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const currentJobInstance =
      await this.generateJobInstanceForPermissions(currentJob);
    const jobConfig = this.getJobTypeConfiguration(currentJob.type);
    const ability = this.caslAbilityFactory.jobsInstanceAccess(
      request.user as JWTUser,
      jobConfig,
    );
    // check if the user can update this job
    const canUpdate =
      ability.can(Action.JobUpdateAny, JobClass) ||
      ability.can(Action.JobUpdateOwner, currentJobInstance) ||
      (ability.can(Action.JobUpdateConfiguration, currentJobInstance) &&
        jobConfig.update.auth != UpdateJobAuth.JobAdmin);
    if (!canUpdate) {
      throw new ForbiddenException("Unauthorized to update this job.");
    }

    // Allow actions to validate DTO
    const validateContext = {
      request: updateJobDto,
      job: currentJob,
      env: process.env,
    };
    const contextWithDatasets = await loadDatasets(
      this.datasetsService,
      validateContext,
    );
    await validateActions(jobConfig.update.actions, contextWithDatasets);

    const updateJobDtoForService =
      request.headers["content-type"] === "application/merge-patch+json"
        ? jmp.apply(currentJob, updateJobDto)
        : updateJobDto;

    // Update job in database
    const updatedJob = await this.jobsService.update(
      id,
      updateJobDtoForService,
    );
    // Perform the action that is specified in the update portion of the job configuration
    if (updatedJob !== null) {
      await this.checkConfigVersion(jobConfig, updatedJob);
      const performContext = {
        ...contextWithDatasets,
        job: toObject(updatedJob) as JobClass,
      };
      await performActions(jobConfig.update.actions, performContext);
    }
    return updatedJob;
  }

  /**
   * FullQuery implementation
   */
  async fullQueryJobs(
    request: Request,
    filters: { fields?: string; limits?: string },
  ): Promise<PartialOutputJobDto[] | null> {
    try {
      const parsedFilter: IFilters<JobDocument, FilterQuery<JobDocument>> = {
        fields: JSON.parse(filters.fields ?? ("{}" as string)),
        limits: JSON.parse(filters.limits ?? ("{}" as string)),
      };
      const jobsAccess = this.caslAbilityFactory.jobsMongoQueryReadAccess(
        request.user as JWTUser,
      );

      return (await this.jobsService.findByFilters(
        parsedFilter.fields,
        parsedFilter?.limits,
        jobsAccess,
      )) as unknown as PartialOutputJobDto[];
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: (e as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * FullFacet implementation
   */
  async fullFacetJobs(
    request: Request,
    filters: { fields?: string; facets?: string },
  ): Promise<Record<string, unknown>[]> {
    try {
      const fields: IJobFields = JSON.parse(filters.fields ?? ("{}" as string));
      const facetFilters: IFacets<IJobFields> = {
        fields: fields,
        facets: JSON.parse(filters.facets ?? ("[]" as string)),
      };
      const jobsAccess = this.caslAbilityFactory.jobsMongoQueryReadAccess(
        request.user as JWTUser,
      );
      return await this.jobsService.fullfacet(facetFilters, jobsAccess);
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: (e as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get job if it exists and user has access to it.
   */
  async getOneJob(
    request: Request,
    job: PartialIntermediateOutputJobDto,
  ): Promise<PartialIntermediateOutputJobDto> {
    if (job === null) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: "Invalid job id.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    const currentJobInstance =
      await this.generateJobInstanceForPermissions(job);
    const jobConfiguration = this.getJobTypeConfiguration(
      currentJobInstance.type,
    );
    const ability = this.caslAbilityFactory.jobsInstanceAccess(
      request.user as JWTUser,
      jobConfiguration,
    );
    const canRead =
      ability.can(Action.JobReadAny, JobClass) ||
      ability.can(Action.JobReadAccess, currentJobInstance);
    if (!canRead) {
      throw new ForbiddenException("Unauthorized to get this job.");
    }
    return job as PartialIntermediateOutputJobDto;
  }

  /**
   * Get job by id implementation
   */
  async getJobById(
    request: Request,
    id: string,
  ): Promise<PartialOutputJobDto | null> {
    const currentJob = await this.jobsService.findOne({ _id: id });
    return await this.getOneJob(
      request,
      currentJob as unknown as PartialIntermediateOutputJobDto,
    );
  }

  /**
   * Remove fields added to the job to evaluate casl permission if they are not present in fields
   */
  removeFields<
    T extends PartialIntermediateOutputJobDto | JobClass =
      | PartialIntermediateOutputJobDto
      | JobClass,
  >(filter: FilterQuery<JobDocument>, job: T): PartialOutputJobDto {
    if (filter.fields && filter.fields.length > 0) {
      for (const field of mandatoryFields as (keyof T)[]) {
        if (!filter.fields.includes(field as string)) {
          delete job[field];
        }
      }
    }
    return job as PartialOutputJobDto;
  }

  /**
   * Get job by query implementation
   */
  async getJobByQuery(
    request: Request,
    filter: FilterQuery<JobDocument>,
  ): Promise<PartialOutputJobDto | null> {
    const jobsFound = await this.jobsService.findJobComplete(filter);
    if (jobsFound !== null && jobsFound.length !== 0) {
      const job = await this.getOneJob(request, jobsFound[0]);
      const finalJob = this.removeFields(filter, job);
      return finalJob;
    } else {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: "Invalid job id.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * Get jobs implementation
   */
  async getJobs(
    request: Request,
    filter?: string,
  ): Promise<PartialOutputJobDto[]> {
    try {
      const parsedFilter = JSON.parse(filter ?? "{}");
      const jobsAccess = this.caslAbilityFactory.jobsMongoQueryReadAccess(
        request.user as JWTUser,
      );
      const jobs = await this.jobsService.findJobComplete(
        parsedFilter,
        jobsAccess,
      );
      return jobs.map((job) => this.removeFields(parsedFilter, job));
    } catch (e) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: (e as Error).message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
