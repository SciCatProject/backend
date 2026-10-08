import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { RuntimeConfigAbility } from "./runtime-config.ability";
import { RuntimeConfig } from "src/config/runtime-config/schemas/runtime-config.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  adminUser,
} from "./test-data.util";

describe("RuntimeConfigAbility", () => {
  let abilityBuilder: RuntimeConfigAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        RuntimeConfigAbility,
      ],
    }).compile();

    abilityBuilder = module.get<RuntimeConfigAbility>(RuntimeConfigAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.Read, RuntimeConfig)).toBe(true);
      expect(ability.can(Action.Update, RuntimeConfig)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.Read, RuntimeConfig)).toBe(true);
      expect(ability.can(Action.Update, RuntimeConfig)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.Read, RuntimeConfig)).toBe(true);
      expect(ability.can(Action.Update, RuntimeConfig)).toBe(true);
    });
  });
});
