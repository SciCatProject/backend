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

      expect(ability.can(Action.Create, JobClass)).toBe(true);
      expect(ability.can(Action.Create, publicJob)).toBe(true);
      expect(ability.can(Action.Create, ownedJob)).toBe(false);
      expect(ability.can(Action.Create, privilegedJob)).toBe(false);
      expect(ability.can(Action.Read, JobClass)).toBe(false);
      expect(ability.can(Action.Read, publicJob)).toBe(false);
      expect(ability.can(Action.Read, ownedJob)).toBe(false);
      expect(ability.can(Action.Read, privilegedJob)).toBe(false);
      expect(ability.can(Action.Update, JobClass)).toBe(true);
      expect(ability.can(Action.Update, publicJob)).toBe(true);
      expect(ability.can(Action.Update, ownedJob)).toBe(false);
      expect(ability.can(Action.Update, privilegedJob)).toBe(false);
      expect(ability.can(Action.Delete, JobClass)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.Create, JobClass)).toBe(true);
      expect(ability.can(Action.Create, publicJob)).toBe(true);
      expect(ability.can(Action.Create, ownedJob)).toBe(true);
      expect(ability.can(Action.Create, privilegedJob)).toBe(false);
      expect(ability.can(Action.Read, JobClass)).toBe(true);
      expect(ability.can(Action.Read, publicJob)).toBe(false);
      expect(ability.can(Action.Read, ownedJob)).toBe(true);
      expect(ability.can(Action.Read, privilegedJob)).toBe(false);
      expect(ability.can(Action.Update, JobClass)).toBe(true);
      expect(ability.can(Action.Update, publicJob)).toBe(true);
      expect(ability.can(Action.Update, ownedJob)).toBe(true);
      expect(ability.can(Action.Update, privilegedJob)).toBe(false);
      expect(ability.can(Action.Delete, JobClass)).toBe(false);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.Create, JobClass)).toBe(true);
      expect(ability.can(Action.Create, publicJob)).toBe(true);
      expect(ability.can(Action.Create, ownedJob)).toBe(true);
      expect(ability.can(Action.Create, privilegedJob)).toBe(false);
      expect(ability.can(Action.Read, JobClass)).toBe(true);
      expect(ability.can(Action.Read, publicJob)).toBe(false);
      expect(ability.can(Action.Read, ownedJob)).toBe(false);
      expect(ability.can(Action.Read, privilegedJob)).toBe(false);
      expect(ability.can(Action.Update, JobClass)).toBe(true);
      expect(ability.can(Action.Update, publicJob)).toBe(true);
      expect(ability.can(Action.Update, ownedJob)).toBe(false);
      expect(ability.can(Action.Update, privilegedJob)).toBe(false);
      expect(ability.can(Action.Delete, JobClass)).toBe(false);
    });
  });

  describe("CREATE_JOB_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to CREATE_JOB_PRIVILEGED_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(createJobPrivilegedUser);

      expect(ability.can(Action.Create, JobClass)).toBe(true);
      expect(ability.can(Action.Create, publicJob)).toBe(true);
      expect(ability.can(Action.Create, ownedJob)).toBe(true);
      expect(ability.can(Action.Create, privilegedJob)).toBe(true);
      expect(ability.can(Action.Read, JobClass)).toBe(true);
      expect(ability.can(Action.Read, publicJob)).toBe(true);
      expect(ability.can(Action.Read, ownedJob)).toBe(true);
      expect(ability.can(Action.Read, privilegedJob)).toBe(true);
      expect(ability.can(Action.Update, JobClass)).toBe(false);
      expect(ability.can(Action.Update, publicJob)).toBe(false);
      expect(ability.can(Action.Update, ownedJob)).toBe(false);
      expect(ability.can(Action.Update, privilegedJob)).toBe(false);
      expect(ability.can(Action.Delete, JobClass)).toBe(false);
    });
  });

  describe("UPDATE_JOB_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to UPDATE_JOB_PRIVILEGED_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(updateJobPrivilegedUser);

      expect(ability.can(Action.Create, JobClass)).toBe(false);
      expect(ability.can(Action.Create, publicJob)).toBe(false);
      expect(ability.can(Action.Create, ownedJob)).toBe(false);
      expect(ability.can(Action.Create, privilegedJob)).toBe(false);
      expect(ability.can(Action.Read, JobClass)).toBe(true);
      expect(ability.can(Action.Read, publicJob)).toBe(true);
      expect(ability.can(Action.Read, ownedJob)).toBe(true);
      expect(ability.can(Action.Read, privilegedJob)).toBe(true);
      expect(ability.can(Action.Update, JobClass)).toBe(true);
      expect(ability.can(Action.Update, publicJob)).toBe(true);
      expect(ability.can(Action.Update, ownedJob)).toBe(true);
      expect(ability.can(Action.Update, privilegedJob)).toBe(true);
      expect(ability.can(Action.Delete, JobClass)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.Create, JobClass)).toBe(true);
      expect(ability.can(Action.Create, publicJob)).toBe(true);
      expect(ability.can(Action.Create, ownedJob)).toBe(true);
      expect(ability.can(Action.Create, privilegedJob)).toBe(true);
      expect(ability.can(Action.Read, JobClass)).toBe(true);
      expect(ability.can(Action.Read, publicJob)).toBe(true);
      expect(ability.can(Action.Read, ownedJob)).toBe(true);
      expect(ability.can(Action.Read, privilegedJob)).toBe(true);
      expect(ability.can(Action.Update, JobClass)).toBe(true);
      expect(ability.can(Action.Update, publicJob)).toBe(true);
      expect(ability.can(Action.Update, ownedJob)).toBe(true);
      expect(ability.can(Action.Update, privilegedJob)).toBe(true);
      expect(ability.can(Action.Delete, JobClass)).toBe(false);
    });
  });

  describe("DELETE_JOB_GROUPS permissions", () => {
    it("should give correct rights to DELETE_JOB_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteJobUser);

      expect(ability.can(Action.Create, JobClass)).toBe(true);
      expect(ability.can(Action.Create, publicJob)).toBe(true);
      expect(ability.can(Action.Create, ownedJob)).toBe(true);
      expect(ability.can(Action.Create, privilegedJob)).toBe(false);
      expect(ability.can(Action.Read, JobClass)).toBe(true);
      expect(ability.can(Action.Read, publicJob)).toBe(false);
      expect(ability.can(Action.Read, ownedJob)).toBe(false);
      expect(ability.can(Action.Read, privilegedJob)).toBe(false);
      expect(ability.can(Action.Update, JobClass)).toBe(true);
      expect(ability.can(Action.Update, publicJob)).toBe(true);
      expect(ability.can(Action.Update, ownedJob)).toBe(false);
      expect(ability.can(Action.Update, privilegedJob)).toBe(false);
      expect(ability.can(Action.Delete, JobClass)).toBe(true);
    });
  });
});
