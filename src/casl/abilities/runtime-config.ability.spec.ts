import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { RuntimeConfigAbility } from "./runtime-config.ability";

describe("RuntimeConfigAbility", () => {
  let ability: RuntimeConfigAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [RuntimeConfigAbility],
    }).compile();

    ability = module.get<RuntimeConfigAbility>(RuntimeConfigAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});
});
