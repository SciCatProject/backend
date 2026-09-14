import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { PublishedDataAbility } from "./published-data.ability";

describe("PublishedDataAbility", () => {
  let abilityBuilder: PublishedDataAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [PublishedDataAbility],
    }).compile();

    abilityBuilder = module.get<PublishedDataAbility>(PublishedDataAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_GROUPS permissions", () => {});
});
