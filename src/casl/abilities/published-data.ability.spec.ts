import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { PublishedDataAbility } from "./published-data.ability";

describe("PublishedDataAbility", () => {
  let ability: PublishedDataAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [PublishedDataAbility],
    }).compile();

    ability = module.get<PublishedDataAbility>(PublishedDataAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_GROUPS permissions", () => {});
});
