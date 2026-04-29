import {
  CallHandler,
  ExecutionContext,
  Inject,
  Injectable,
  NestInterceptor,
} from "@nestjs/common";
import { Request } from "express";
import { Observable } from "rxjs";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { CreateJobDtoV3 } from "../dto/create-job.v3.dto";
import { CreateJobDto } from "../dto/create-job.dto";
import { DatasetListDto } from "../dto/dataset-list.dto";
import { UsersService } from "src/users/users.service";
import { DatasetsService } from "src/datasets/datasets.service";
import { JobConfigService } from "src/config/job-config/jobconfig.service";
import { JobsControllerUtils } from "src/jobs/jobs.controller.utils";
import { omit } from "lodash";
import { CreateJobAuth } from "../types/jobs-auth.enum";
import { DatasetDocument } from "src/datasets/schemas/dataset.schema";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { FilterQuery } from "mongoose";

interface JobParams {
  datasetList: DatasetListDto[];
  executionTime?: Date;
  [key: string]: unknown;
}

/**
 * POST/api/v3/jobs requires a CreateJobDtoV3 object as request body.
 * This interceptor maps the CreateJobDtoV3 object to a CreateJobDto object,
 * to ensure compatibility with POST/api/v4/jobs.
 */
@Injectable()
export class CreateJobV3MappingInterceptor implements NestInterceptor {
  adminUsers: Set<string>;
  constructor(
    @Inject(UsersService) readonly usersService: UsersService,
    @Inject(DatasetsService) readonly datasetsService: DatasetsService,
    @Inject(JobConfigService) readonly jobConfigService: JobConfigService,
    @Inject(ConfigService) readonly configService: ConfigService,
    private readonly jobsControllerUtils: JobsControllerUtils,
  ) {
    this.adminUsers = new Set(
      this.configService.get<AccessGroupsType>("accessGroups")?.admin ?? [],
    );
  }

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<unknown>> {
    const request = context.switchToHttp().getRequest() as Request;
    const dtoV3 = request.body as CreateJobDtoV3;
    const requestUser = request.user as JWTUser;

    const jobConfig = this.jobsControllerUtils.getJobTypeConfiguration(
      dtoV3.type,
    );
    if (!jobConfig) return next.handle();
    const jobParams: JobParams = this.buildJobParams(dtoV3);
    const newBody: CreateJobDto = {
      type: dtoV3.type,
      jobParams: jobParams,
    };
    if (dtoV3.emailJobInitiator || requestUser)
      newBody.contactEmail = dtoV3.emailJobInitiator ?? requestUser.email;
    // ensure compatibility with the FE, which provides the username field in jobParams
    // and compatibility with v4 which requires ownerUser in the dto of jobs created by normal users
    // if username is not provided, use the username from the request user
    const jobUser: JWTUser | null = await this.buildOwnerUser(
      jobParams,
      requestUser,
    );
    if (jobUser) newBody.ownerUser = jobUser?.username;
    // ensure compatibility with v4 which requires ownerGroup in the dto of jobs created by normal user
    const ownerGroup = await this.buildOwnerGroup(
      jobParams,
      jobConfig.create.auth,
      jobUser?.currentGroups ?? null,
    );
    if (ownerGroup) newBody.ownerGroup = ownerGroup;
    request.body = newBody;
    return next.handle();
  }

  private async buildOwnerUser(jobParams: JobParams, requestUser: JWTUser) {
    if ("username" in jobParams) {
      const jwtUser = await this.usersService.findByUsername2JWTUser(
        jobParams.username as string,
      );
      return jwtUser;
    }
    if (requestUser) return requestUser;
    return null;
  }

  private buildJobParams(dtoV3: CreateJobDtoV3) {
    // ensure datasetList comes from a top level field in the dto and not from jobParams
    const jobParams: JobParams = {
      ...omit(dtoV3.jobParams ?? {}, ["datasetList"]),
      datasetList: dtoV3.datasetList ?? [],
    };
    // to preserve the executionTime field, if provided, add it to jobParams
    if (dtoV3.executionTime) jobParams.executionTime = dtoV3.executionTime;
    // to preserve the jobStatusMessage field, if provided, add it to jobParams
    if (dtoV3.jobStatusMessage)
      jobParams.jobStatusMessage = dtoV3.jobStatusMessage;
    return jobParams;
  }

  private async buildOwnerGroup(
    jobParams: JobParams,
    jobConfigCreateAuth: string,
    jobUserCurrentGroups: string[] | null,
  ): Promise<string | undefined> {
    if ("ownerGroup" in jobParams) return jobParams.ownerGroup as string;
    const datasetList = jobParams.datasetList;
    if (datasetList.length === 0) return undefined;
    const datasetPid = datasetList.map((datasetDto) => datasetDto.pid);
    if (jobConfigCreateAuth === CreateJobAuth.DatasetPublic) return undefined;
    const datasetsFilter: FilterQuery<DatasetDocument> = {
      where: { pid: { $in: datasetPid } },
      fields: ["ownerGroup"],
    };
    const isAdmin = jobUserCurrentGroups?.some((group) =>
      this.adminUsers.has(group),
    );
    if (jobConfigCreateAuth === CreateJobAuth.DatasetOwner && !isAdmin)
      datasetsFilter.where.ownerGroup = { $in: jobUserCurrentGroups ?? [] };
    if (jobConfigCreateAuth === CreateJobAuth.DatasetAccess) {
      datasetsFilter.where.$or = [
        { isPublished: true },
        { ownerGroup: { $in: jobUserCurrentGroups ?? [] } },
        { accessGroups: { $in: jobUserCurrentGroups ?? [] } },
      ];
      datasetsFilter.fields.push("isPublished", "accessGroups");
    }
    const datasets = await this.datasetsService.findAll(datasetsFilter);
    if (datasets.length !== datasetList.length) return undefined;
    if (datasets.length === 0) return undefined;
    if (
      jobConfigCreateAuth === CreateJobAuth.DatasetAccess &&
      datasets.every((dataset) => dataset?.isPublished)
    )
      return jobUserCurrentGroups?.[0];
    if (jobConfigCreateAuth === CreateJobAuth.DatasetOwner && isAdmin)
      return datasets[0].ownerGroup;
    const commonGroups = this.buildCommonGroups(datasets, jobUserCurrentGroups);
    if (commonGroups.length > 0) return commonGroups[0];
    return undefined;
  }

  private buildCommonGroups(
    datasets: DatasetDocument[],
    jobUserCurrentGroups: string[] | null,
  ): string[] {
    const datasetGroups = datasets
      .filter((dataset) => !dataset.isPublished)
      .map((dataset) => [
        ...(dataset?.accessGroups ?? []),
        dataset?.ownerGroup,
      ]);
    const commonGroups = intersection([
      ...datasetGroups,
      jobUserCurrentGroups ?? [],
    ]);
    return commonGroups;
  }
}

function intersection<T>(arrays: T[][]): T[] {
  if (arrays.length === 0) return [];
  return arrays.reduce((a, b) => {
    const setB = new Set(b);
    return a.filter((x) => setB.has(x));
  });
}
