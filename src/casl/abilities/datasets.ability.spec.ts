import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { DatasetAbility } from "./datasets.ability";

describe("DatasetAbility", () => {
  let ability: DatasetAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [DatasetAbility],
    }).compile();

    ability = module.get<DatasetAbility>(DatasetAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("CREATE_DATASET_GROUPS permissions", () => {});

  describe("CREATE_DATASET_WITH_PID_GROUPS permissions", () => {});

  describe("CREATE_DATASET_PRIVILEGED_GROUPS permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_GROUPS permissions", () => {});

  describe("UPDATE_DATASET_LIFECYCLE_GROUPS permissions", () => {});
});
