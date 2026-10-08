import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { JobConfigService } from "src/config/job-config/jobconfig.service";
import { Action } from "../action.enum";
import { JobAbility } from "./jobs.ability";
import { JobClass } from "src/jobs/schemas/job.schema";
import {
  ConfigServiceMock,
  JobConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  authenticatedUser2,
  adminUser,
  createJobPrivilegedUser,
  updateJobPrivilegedUser,
  deleteJobUser,
  publicJob,
  ownedJob,
  privilegedJob,
} from "./test-data.util";

describe("JobAbility", () => {
  let abilityBuilder: JobAbility;

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
