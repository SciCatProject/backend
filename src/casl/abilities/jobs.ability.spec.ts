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
        historyAttachments: ["historyAttachment"],
        historyDatablocks: ["historyDatablock"],
        historyDataset: ["historyDataset"],
        historyInstrument: ["historyInstrument"],
        historyPolicies: ["historyPolicy"],
        historyProposal: ["historyProposal"],
        historyPublishedData: ["historyPublishedData"],
        historySample: ["historySample"],
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
    };
  }
}

describe("JobAbility", () => {
  let abilityBuilder: JobAbility;

  const unauthenticatedUser = null;

  const authenticatedUser1 = {
    username: "user1",
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const authenticatedUser2 = {
    username: "user2",
    currentGroups: ["group2"],
  } as unknown as JWTUser;

  const createJobPrivilegedUser = {
    username: "jobAdmin",
    currentGroups: ["jobAdminGroup", "createJobPrivileged"],
  } as unknown as JWTUser;

  const updateJobPrivilegedUser = {
    username: "jobAdmin",
    currentGroups: ["jobAdminGroup", "updateJobPrivileged"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const deleteJobUser = {
    currentGroups: ["deleteJob"],
  } as unknown as JWTUser;

  const publicJob = new JobClass();
  publicJob.type = "public";
  publicJob.ownerUser = "anonymous";

  const ownedJob = new JobClass();
  ownedJob.type = "owned";
  ownedJob.ownerUser = "user1";
  ownedJob.ownerGroup = "group1";

  const privilegedJob = new JobClass();
  privilegedJob.type = "privileged";
  privilegedJob.ownerUser = "jobAdmin";
  privilegedJob.ownerGroup = "jobAdminGroup";

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

      expect(ability.can(Action.JobCreate, JobClass)).toBe(true);
      expect(ability.can(Action.JobCreate, publicJob)).toBe(true);
      expect(ability.can(Action.JobCreate, ownedJob)).toBe(false);
      expect(ability.can(Action.JobCreate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobRead, JobClass)).toBe(false);
      expect(ability.can(Action.JobRead, publicJob)).toBe(false);
      expect(ability.can(Action.JobRead, ownedJob)).toBe(false);
      expect(ability.can(Action.JobRead, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, JobClass)).toBe(true);
      expect(ability.can(Action.JobUpdate, publicJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, ownedJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobDelete, JobClass)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.JobCreate, JobClass)).toBe(true);
      expect(ability.can(Action.JobCreate, publicJob)).toBe(true);
      expect(ability.can(Action.JobCreate, ownedJob)).toBe(true);
      expect(ability.can(Action.JobCreate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobRead, JobClass)).toBe(true);
      expect(ability.can(Action.JobRead, publicJob)).toBe(false);
      expect(ability.can(Action.JobRead, ownedJob)).toBe(true);
      expect(ability.can(Action.JobRead, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, JobClass)).toBe(true);
      expect(ability.can(Action.JobUpdate, publicJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, ownedJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobDelete, JobClass)).toBe(false);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.JobCreate, JobClass)).toBe(true);
      expect(ability.can(Action.JobCreate, publicJob)).toBe(true);
      expect(ability.can(Action.JobCreate, ownedJob)).toBe(true);
      expect(ability.can(Action.JobCreate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobRead, JobClass)).toBe(true);
      expect(ability.can(Action.JobRead, publicJob)).toBe(false);
      expect(ability.can(Action.JobRead, ownedJob)).toBe(false);
      expect(ability.can(Action.JobRead, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, JobClass)).toBe(true);
      expect(ability.can(Action.JobUpdate, publicJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, ownedJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobDelete, JobClass)).toBe(false);
    });
  });

  describe("CREATE_JOB_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to CREATE_JOB_PRIVILEGED_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(createJobPrivilegedUser);

      expect(ability.can(Action.JobCreate, JobClass)).toBe(true);
      expect(ability.can(Action.JobCreate, publicJob)).toBe(true);
      expect(ability.can(Action.JobCreate, ownedJob)).toBe(true);
      expect(ability.can(Action.JobCreate, privilegedJob)).toBe(true);
      expect(ability.can(Action.JobRead, JobClass)).toBe(true);
      expect(ability.can(Action.JobRead, publicJob)).toBe(true);
      expect(ability.can(Action.JobRead, ownedJob)).toBe(true);
      expect(ability.can(Action.JobRead, privilegedJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, JobClass)).toBe(false);
      expect(ability.can(Action.JobUpdate, publicJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, ownedJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobDelete, JobClass)).toBe(false);
    });
  });

  describe("UPDATE_JOB_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to UPDATE_JOB_PRIVILEGED_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(updateJobPrivilegedUser);

      expect(ability.can(Action.JobCreate, JobClass)).toBe(false);
      expect(ability.can(Action.JobCreate, publicJob)).toBe(false);
      expect(ability.can(Action.JobCreate, ownedJob)).toBe(false);
      expect(ability.can(Action.JobCreate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobRead, JobClass)).toBe(true);
      expect(ability.can(Action.JobRead, publicJob)).toBe(true);
      expect(ability.can(Action.JobRead, ownedJob)).toBe(true);
      expect(ability.can(Action.JobRead, privilegedJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, JobClass)).toBe(true);
      expect(ability.can(Action.JobUpdate, publicJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, ownedJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, privilegedJob)).toBe(true);
      expect(ability.can(Action.JobDelete, JobClass)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.JobCreate, JobClass)).toBe(true);
      expect(ability.can(Action.JobCreate, publicJob)).toBe(true);
      expect(ability.can(Action.JobCreate, ownedJob)).toBe(true);
      expect(ability.can(Action.JobCreate, privilegedJob)).toBe(true);
      expect(ability.can(Action.JobRead, JobClass)).toBe(true);
      expect(ability.can(Action.JobRead, publicJob)).toBe(true);
      expect(ability.can(Action.JobRead, ownedJob)).toBe(true);
      expect(ability.can(Action.JobRead, privilegedJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, JobClass)).toBe(true);
      expect(ability.can(Action.JobUpdate, publicJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, ownedJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, privilegedJob)).toBe(true);
      expect(ability.can(Action.JobDelete, JobClass)).toBe(false);
    });
  });

  describe("DELETE_JOB_GROUPS permissions", () => {
    it("should give correct rights to DELETE_JOB_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteJobUser);

      expect(ability.can(Action.JobCreate, JobClass)).toBe(true);
      expect(ability.can(Action.JobCreate, publicJob)).toBe(true);
      expect(ability.can(Action.JobCreate, ownedJob)).toBe(true);
      expect(ability.can(Action.JobCreate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobRead, JobClass)).toBe(true);
      expect(ability.can(Action.JobRead, publicJob)).toBe(false);
      expect(ability.can(Action.JobRead, ownedJob)).toBe(false);
      expect(ability.can(Action.JobRead, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, JobClass)).toBe(true);
      expect(ability.can(Action.JobUpdate, publicJob)).toBe(true);
      expect(ability.can(Action.JobUpdate, ownedJob)).toBe(false);
      expect(ability.can(Action.JobUpdate, privilegedJob)).toBe(false);
      expect(ability.can(Action.JobDelete, JobClass)).toBe(true);
    });
  });
});
