import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { RuntimeConfigAbility } from "./runtime-config.ability";

describe("RuntimeConfigAbility", () => {
  let abilityBuilder: RuntimeConfigAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [RuntimeConfigAbility],
    }).compile();

    abilityBuilder = module.get<RuntimeConfigAbility>(RuntimeConfigAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});
});
