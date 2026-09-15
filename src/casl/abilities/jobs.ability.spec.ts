import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { JobConfigService } from "src/config/job-config/jobconfig.service";
import { JobAbility } from "./jobs.ability";

class JobConfigServiceMock {}

describe("JobAbility", () => {
  let ability: JobAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [
        { provide: JobConfigService, useClass: JobConfigServiceMock },
        JobAbility,
      ],
    }).compile();

    ability = module.get<JobAbility>(JobAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("CREATE_JOB_PRIVILEGED_GROUPS permissions", () => {});

  describe("UPDATE_JOB_PRIVILEGED_GROUPS permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_JOB_GROUPS permissions", () => {});
});
