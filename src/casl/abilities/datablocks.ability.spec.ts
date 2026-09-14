import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatablockAbility } from "./datablocks.ability";

describe("DatablockAbility", () => {
  let abilityBuilder: DatablockAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [DatablockAbility],
    }).compile();

    abilityBuilder = module.get<DatablockAbility>(DatablockAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("CREATE_DATASET_GROUPS permissions", () => {});

  describe("CREATE_DATASET_WITH_PID_GROUPS permissions", () => {});

  describe("CREATE_DATASET_PRIVILEGED_GROUPS permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_GROUPS permissions", () => {});
});
