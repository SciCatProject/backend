import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JobConfigService } from "src/config/job-config/jobconfig.service";
import { JobConfig } from "src/config/job-config/jobconfig.interface";
import { CreateJobAuth, UpdateJobAuth } from "src/jobs/types/jobs-auth.enum";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { JobAbility } from "./jobs.ability";
import { JobClass } from "src/jobs/schemas/job.schema";

class ConfigServiceMock {
  get = jest.fn((key: string) => {
    if (key === "accessGroups") {
      return {
        admin: ["admin"],
        delete: ["delete"],
        attachment: ["attachment"],
        attachmentPrivileged: ["attachmentPrivileged"],
        createDataset: ["createDataset"],
        createDatasetWithPid: ["createDatasetWithPid"],
        createDatasetPrivileged: ["createDatasetPrivileged"],
        updateDatasetLifecycle: ["updateDatasetLifecycle"],
        historyProposal: ["historyProposal"],
        historyDataset: ["historyDataset"],
        historySample: ["historySample"],
        historyInstrument: ["historyInstrument"],
        historyPublishedData: ["historyPublishedData"],
        historyPolicies: ["historyPolicies"],
        historyDatablocks: ["historyDatablocks"],
        historyAttachments: ["historyAttachments"],
        createJobPrivileged: ["createJobPrivileged"],
        updateJobPrivileged: ["updateJobPrivileged"],
        deleteJob: ["deleteJob"],
        policy: ["policy"],
        proposal: ["proposal"],
        sample: ["sample"],
        samplePrivileged: ["samplePrivileged"],
      } as AccessGroupsType;
    }
    return null;
  });
}

class JobConfigServiceMock {
  public get allJobConfigs(): Readonly<Record<string, JobConfig>> {
    return {
      public: {
        jobType: "public",
        create: { auth: CreateJobAuth.All },
        update: { auth: UpdateJobAuth.All },
      } as unknown as JobConfig,
      owned: {
        jobType: "owned",
        create: { auth: CreateJobAuth.Authenticated },
        update: { auth: UpdateJobAuth.JobOwnerGroup },
      } as unknown as JobConfig,
      privileged: {
        jobType: "privileged",
        create: { auth: CreateJobAuth.JobAdmin },
        update: { auth: UpdateJobAuth.JobAdmin },
      } as unknown as JobConfig,
    };;
  }
}

describe("JobAbility", () => {
  let abilityBuilder: JobAbility;

  const unauthenticatedUser = null;

  const authenticatedUser1 = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const authenticatedUser2 = {
    currentGroups: ["group2"],
  } as unknown as JWTUser;

  const createJobPrivilegedUser1 = {
    currentGroups: ["group1", "createJobPrivileged"],
  } as unknown as JWTUser;

  const createJobPrivilegedUser2 = {
    currentGroups: ["group2", "createJobPrivileged"],
  } as unknown as JWTUser;

  const updateJobPrivilegedUser1 = {
    currentGroups: ["group1", "updateJobPrivileged"],
  } as unknown as JWTUser;

  const updateJobPrivilegedUser2 = {
    currentGroups: ["group2", "updateJobPrivileged"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const deleteUser = {
    currentGroups: ["delete"],
  } as unknown as JWTUser;

  const publicJob = new JobClass();
  publicJob.type = "public";
  publicJob.ownerGroup = "group1";

  const ownedJob = new JobClass();
  ownedJob.type = "owned";
  ownedJob.ownerGroup = "group1";

  const privilegedJob = new JobClass();
  privilegedJob.type = "privileged";
  privilegedJob.ownerGroup = "group1";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        { provide: JobConfigService, useClass: JobConfigServiceMock },
        JobAbility,
      ],
    }).compile();

    abilityBuilder = module.get<JobAbility>(JobAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);
    });
  });

  describe("CREATE_JOB_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to CREATE_JOB_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createJobPrivilegedUser1);
    });

    it("should give correct rights to CREATE_JOB_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createJobPrivilegedUser2);
    });
  });

  describe("UPDATE_JOB_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to UPDATE_JOB_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(updateJobPrivilegedUser1);
    });

    it("should give correct rights to UPDATE_JOB_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(updateJobPrivilegedUser2);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);
    });
  });

  describe("DELETE_JOB_GROUPS permissions", () => {
    it("should give correct rights to DELETE_JOB_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);
    });
  });
});
