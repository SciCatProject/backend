import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { MetadataKeyAbility } from "./metadata-keys.ability";

describe("MetadataKeyAbility", () => {
  let abilityBuilder: MetadataKeyAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [MetadataKeyAbility],
    }).compile();

    abilityBuilder = module.get<MetadataKeyAbility>(MetadataKeyAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});
});
