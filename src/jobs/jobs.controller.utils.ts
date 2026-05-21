import {
  Injectable,
  HttpStatus,
  HttpException,
  ForbiddenException,
} from "@nestjs/common";
import { Request } from "express";
import { FilterQuery } from "mongoose";
import * as jmp from "json-merge-patch";
import { JobsService } from "./jobs.service";
import { CreateJobDto } from "./dto/create-job.dto";
import { UpdateJobDto } from "./dto/update-job.dto";
import { DatasetListDto } from "./dto/dataset-list.dto";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { CreateJobAuth } from "src/jobs/types/jobs-auth.enum";
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
import { accessibleBy } from "@casl/mongoose";

@Injectable()
export class JobsControllerUtils {
  jobDatasetAuthorization: Array<string> = [];
  private accessGroups;

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
    if (!Array.isArray(datasetList)) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: "Invalid dataset list",
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    if (datasetList.length == 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: "List of passed datasets is empty.",
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // check that datasetList is of type DatasetListDto[]
    const datasetListDtos: DatasetListDto[] = datasetList.map((item) => {
      return Object.assign(new DatasetListDto(), item);
    });
    const allowedKeys = [JobParams.Pid, JobParams.Files] as string[];
    for (const datasetListDto of datasetListDtos) {
      const keys = Object.keys(datasetListDto);
      if (
        keys.length !== 2 ||
        !keys.every((key) => allowedKeys.includes(key))
      ) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message:
              "Dataset list is expected to contain sets of pid and files.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (typeof datasetListDto[JobParams.Pid] !== "string") {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: "In datasetList each 'pid' field should be a string.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      if (!Array.isArray(datasetListDto[JobParams.Files])) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: "In datasetList each 'files' field should be an array.",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
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
    interface condition {
      where: {
        pid: { $in: string[] };
      };
    }

    const datasetIds = datasetList.map((x) => x.pid);
    const filter: condition = {
      where: {
        pid: { $in: datasetIds },
      },
    };

    const findDatasetsById = await this.datasetsService.findAll(filter);
    const findIds = findDatasetsById.map(({ pid }) => pid);
    const nonExistIds = datasetIds.filter((x) => !findIds.includes(x));

    if (nonExistIds.length != 0) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: `Datasets with pid ${nonExistIds} do not exist.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
    return;
  }

  /**
   * Check that the dataset files are valid
   */
  async checkDatasetFiles(datasetList: DatasetListDto[]): Promise<void> {
    const datasetsToCheck = datasetList.filter((x) => x.files.length > 0);
    const ids = datasetsToCheck.map((x) => x.pid);
    if (ids.length > 0) {
      const filter = {
        fields: {
          pid: true,
          datasetId: true,
          dataFileList: true,
        },
        where: {
          pid: {
            $in: ids,
          },
        },
      };
      // Indexing originDataBlock with pid and create set of files for each dataset
      const datasets = await this.datasetsService.findAll(filter);
      // Include origdatablocks
      let datasetOrigDatablocks: OrigDatablock[] = [];
      await Promise.all(
        datasets.map(async (dataset) => {
          datasetOrigDatablocks = await this.origDatablocksService.findAll({
            where: { datasetId: dataset.pid },
          });
        }),
      );
      const result: Record<string, Set<string>> = datasets.reduce(
        (acc: Record<string, Set<string>>, dataset) => {
          // Using Set make searching more efficient
          const files = datasetOrigDatablocks.reduce((acc, block) => {
            block.dataFileList.forEach((file) => {
              acc.add(file.path);
            });
            return acc;
          }, new Set<string>());
          acc[dataset.pid] = files;
          return acc;
        },
        {},
      );
      // Get a list of requested files that were not found
      const checkResults = datasetsToCheck.reduce(
        (acc: { pid: string; nonExistFiles: string[] }[], x) => {
          const pid = x.pid;
          const referenceFiles = result[pid];
          const nonExistFiles = x.files.filter((f) => !referenceFiles.has(f));
          if (nonExistFiles.length > 0) {
            acc.push({ pid, nonExistFiles });
          }
          return acc;
        },
        [],
      );
      if (checkResults.length > 0) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: "At least one requested file could not be found.",
            error: JSON.stringify(
              checkResults.map(({ pid, nonExistFiles }) => ({
                pid,
                nonExistFiles,
              })),
            ),
          },
          HttpStatus.BAD_REQUEST,
        );
      }
    }
    return;
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
   * Build read access filter for mongodb
   */
  readAccessFilter(user: JWTUser) {
    const abilities = this.caslAbilityFactory.jobAccess(user);

    return {
      $or: [accessibleBy(abilities, Action.JobRead).ofType(JobClass)],
    };
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

  /**
   * Checking if user is allowed to create job according to auth field of job configuration
   */
  async instanceAuthorizationJobCreate(
    jobCreateDto: CreateJobDto,
    user: JWTUser,
  ): Promise<JobClass> {
    // NOTE: We need JobClass instance because casl module works only on that.
    // If other fields are needed can be added later.
    const jobInstance = new JobClass();
    const jobConfiguration = this.getJobTypeConfiguration(jobCreateDto.type);
    jobInstance._id = "";
    jobInstance.accessGroups = [];
    jobInstance.type = jobCreateDto.type;
    if (jobCreateDto.contactEmail) {
      jobInstance.contactEmail = jobCreateDto.contactEmail;
    }
    // check if jobStatusMessage was provided via v3 and remove it from jobParams
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

    // validate datasetList, if it exists in jobParams
    let datasetList: DatasetListDto[] = [];
    let datasetsNoAccess = 0;
    if (JobParams.DatasetList in jobCreateDto.jobParams) {
      datasetList = await this.validateDatasetList(jobCreateDto.jobParams);
      jobInstance.jobParams = {
        ...jobInstance.jobParams,
        [JobParams.DatasetList]: datasetList,
      };
    }
    let jobUser: JWTUser | null = null;
    if (user) {
      // the request comes from a user who is logged in.
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g)) ||
        user.currentGroups.some((g) =>
          this.accessGroups?.createJobPrivileged.includes(g),
        )
      ) {
        // admin users and users  in CREATE_JOB_PRIVILEGED group
        if (jobCreateDto.ownerUser) {
          if (user.username != jobCreateDto.ownerUser) {
            jobUser = await this.usersService.findByUsername2JWTUser(
              jobCreateDto.ownerUser,
            );
            if (jobUser === null) {
              Logger.log(
                "Owner user was not found, using current user instead.",
                "instanceAuthorizationJobCreate",
              );
            }
            jobInstance.ownerUser =
              (jobUser?.username as string) ?? user.username;
          } else {
            jobInstance.ownerUser = user.username;
          }
        }
        if (jobCreateDto.ownerGroup) {
          // TODO?: ensure that the provided ownerGroup exists
          jobInstance.ownerGroup = jobCreateDto.ownerGroup;
        }
        if (
          !jobCreateDto.ownerGroup &&
          !jobCreateDto.ownerUser &&
          !jobCreateDto.contactEmail
        ) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              message:
                "Contact email should be specified for an anonymous job.",
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        // prioritize jobCreateDto.contactEmail for anonymous users
        jobInstance.contactEmail =
          jobCreateDto.contactEmail ?? (jobUser?.email as string) ?? user.email;
      } else {
        // check if we have ownerGroup
        if (!jobCreateDto.ownerGroup) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              message: `Invalid new job. Owner group should be specified.`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        // check that job user matches the user placing the request, if job user is specified
        if (jobCreateDto.ownerUser && jobCreateDto.ownerUser != user.username) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              message: `Invalid new job. User owning the job should match user logged in.`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        jobInstance.ownerUser = user.username;
        jobInstance.contactEmail = jobCreateDto.contactEmail ?? user.email;
        // check that ownerGroup is one of the user groups
        if (!user.currentGroups.includes(jobCreateDto.ownerGroup)) {
          throw new HttpException(
            {
              status: HttpStatus.BAD_REQUEST,
              message: `Invalid new job. User needs to belong to job owner group.`,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        jobInstance.ownerGroup = jobCreateDto.ownerGroup;
      }
    }

    if (
      jobConfiguration.create.auth &&
      Object.values(this.jobDatasetAuthorization).includes(
        jobConfiguration.create.auth,
      )
    ) {
      // check that jobParams are passed for #dataset jobs
      if (!(JobParams.DatasetList in jobCreateDto.jobParams)) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            message: "Dataset ids list was not provided in jobParams",
          },
          HttpStatus.BAD_REQUEST,
        );
      }
      // verify that the user meet the requested permissions on the datasets listed
      // build the condition
      type FieldFilter = { $eq?: string; $in?: string[] };
      type BasicCondition = { [field: string]: FieldFilter | boolean };

      type LogicalCondition =
        | { $and: BasicCondition[] }
        | { $or: BasicCondition[] };

      interface datasetsWhere {
        where: {
          pid: { $in: string[] };
          isPublished?: boolean;
          ownerGroup?: FieldFilter;
          $or?: (BasicCondition | LogicalCondition)[];
        };
      }

      const datasetIds = datasetList.map((x) => x.pid);
      const datasetsWhere: datasetsWhere = {
        where: {
          pid: { $in: datasetIds },
        },
      };
      if (jobConfiguration.create.auth === "#datasetPublic") {
        datasetsWhere["where"]["isPublished"] = true;
      } else if (jobConfiguration.create.auth === "#datasetAccess") {
        // jobAdmin creates job for someone and ownerUser not specified, only ownerGroup or
        // user creating the job and ownerUser are the same or
        // ownerUser specified in the DTO is part of ownerGroup specified in the DTO
        if (
          (!jobUser && jobInstance.ownerGroup) ||
          (jobUser && user.username === jobUser.username) ||
          (jobUser && jobUser.currentGroups.includes(jobInstance.ownerGroup))
        ) {
          datasetsWhere["where"]["$or"] = [
            { ownerGroup: { $eq: jobInstance.ownerGroup } },
            { accessGroups: { $eq: jobInstance.ownerGroup } },
            { isPublished: true },
          ];
        } else if (jobUser && !jobInstance.ownerGroup) {
          // job for user with no ownerGroup specified
          datasetsWhere["where"]["$or"] = [
            { ownerGroup: { $in: jobUser.currentGroups } },
            { accessGroups: { $in: jobUser.currentGroups } },
            { isPublished: true },
          ];
        }
        // job for different user and group
        else if (
          jobUser &&
          !jobUser.currentGroups.includes(jobInstance.ownerGroup)
        ) {
          // check that both the user and group have access to datasets
          datasetsWhere["where"]["$or"] = [
            {
              $and: [
                { ownerGroup: { $eq: jobInstance.ownerGroup } },
                { ownerGroup: { $in: jobUser.currentGroups } },
              ],
            },
            {
              $and: [
                { accessGroups: { $eq: jobInstance.ownerGroup } },
                { accessGroups: { $in: jobUser.currentGroups } },
              ],
            },
            { isPublished: true },
          ];
        } else {
          // job for anonymous user
          datasetsWhere["where"]["isPublished"] = true;
        }
      } else if (jobConfiguration.create.auth === "#datasetOwner") {
        if (
          !user ||
          (!user.currentGroups.some((g) =>
            this.accessGroups?.admin.includes(g),
          ) &&
            !jobCreateDto.ownerGroup &&
            !jobCreateDto.ownerUser)
        ) {
          throw new HttpException(
            {
              status: HttpStatus.UNAUTHORIZED,
              message: "User not authenticated",
            },
            HttpStatus.UNAUTHORIZED,
          );
        }

        if (
          (!jobUser && jobInstance.ownerGroup) ||
          (jobUser && user.username === jobUser.username) ||
          (jobUser && jobUser.currentGroups.includes(jobInstance.ownerGroup))
        ) {
          datasetsWhere["where"]["ownerGroup"] = {
            $eq: jobInstance.ownerGroup,
          };
        } else if (jobUser && !jobInstance.ownerGroup) {
          // job for user with no ownerGroup specified
          datasetsWhere["where"]["ownerGroup"] = { $in: jobUser.currentGroups };
        } else if (
          // job for different user and group
          jobUser &&
          !jobUser.currentGroups.includes(jobInstance.ownerGroup)
        ) {
          // check that both the user and group have access to datasets
          datasetsWhere["where"]["$or"] = [
            {
              $and: [
                { ownerGroup: { $eq: jobInstance.ownerGroup } },
                { ownerGroup: { $in: jobUser.currentGroups } },
              ],
            },
          ];
        } else {
          // job for anonymous user is always faulty, because job id cannot be empty
          datasetsWhere["where"]["$or"] = [{ _id: { $in: [] } }];
        }
      }

      if (
        user &&
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        datasetsNoAccess = 0;
      } else {
        const numberOfDatasetsWithAccess =
          await this.datasetsService.count(datasetsWhere);
        datasetsNoAccess = datasetIds.length - numberOfDatasetsWithAccess.count;
      }
    }

    if (!user && jobCreateDto.ownerGroup) {
      throw new HttpException(
        {
          status: HttpStatus.BAD_REQUEST,
          message: `Invalid new job. Unauthenticated user cannot initiate a job owned by another user.`,
        },
        HttpStatus.BAD_REQUEST,
      );
    }

    // instantiate the casl matrix for the user
    const ability = this.caslAbilityFactory.jobAccess(user);
    // check if the user can create this job
    const canCreate =
      ability.can(Action.JobCreate, jobInstance) && datasetsNoAccess == 0;

    if (!canCreate) {
      throw new ForbiddenException("Unauthorized to create this job.");
    }

    return jobInstance;
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
    const ability = this.caslAbilityFactory.jobAccess(request.user as JWTUser);
    // check if the user can update this job
    const canUpdate = ability.can(Action.JobUpdate, currentJobInstance);

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
      const jobsAccess = this.readAccessFilter(request.user as JWTUser);

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
      const jobsAccess = this.readAccessFilter(request.user as JWTUser);
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

    const ability = this.caslAbilityFactory.jobAccess(request.user as JWTUser);
    const canRead = ability.can(Action.JobRead, currentJobInstance);

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
      const jobsAccess = this.readAccessFilter(request.user as JWTUser);
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
