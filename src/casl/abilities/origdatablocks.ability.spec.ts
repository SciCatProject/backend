import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { OrigDatablockAbility } from "./origdatablocks.ability";

describe("OrigDatablockAbility", () => {
  let ability: OrigDatablockAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [OrigDatablockAbility],
    }).compile();

    ability = module.get<OrigDatablockAbility>(OrigDatablockAbility);
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
});
