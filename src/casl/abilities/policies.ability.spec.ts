import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { PolicyAbility } from "./policies.ability";
import { Policy } from "src/policies/schemas/policy.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  adminUser,
  deleteUser,
  policyUser,
} from "./test-data.util";

describe("PolicyAbility", () => {
  let abilityBuilder: PolicyAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        PolicyAbility,
      ],
    }).compile();

    abilityBuilder = module.get<PolicyAbility>(PolicyAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, Policy)).toBe(false);
      expect(ability.can(Action.Create, Policy)).toBe(false);
      expect(ability.can(Action.Read, Policy)).toBe(false);
      expect(ability.can(Action.Update, Policy)).toBe(false);
      expect(ability.can(Action.Delete, Policy)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, Policy)).toBe(false);
      expect(ability.can(Action.Create, Policy)).toBe(false);
      expect(ability.can(Action.Read, Policy)).toBe(false);
      expect(ability.can(Action.Update, Policy)).toBe(false);
      expect(ability.can(Action.Delete, Policy)).toBe(false);
    });
  });

  describe("POLICY_GROUPS permissions", () => {
    it("should give correct rights to POLICY_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(policyUser);

      expect(ability.can(Action.AccessAny, Policy)).toBe(true);
      expect(ability.can(Action.Create, Policy)).toBe(true);
      expect(ability.can(Action.Read, Policy)).toBe(true);
      expect(ability.can(Action.Update, Policy)).toBe(true);
      expect(ability.can(Action.Delete, Policy)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, Policy)).toBe(true);
      expect(ability.can(Action.Create, Policy)).toBe(true);
      expect(ability.can(Action.Read, Policy)).toBe(true);
      expect(ability.can(Action.Update, Policy)).toBe(true);
      expect(ability.can(Action.Delete, Policy)).toBe(false);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, Policy)).toBe(false);
      expect(ability.can(Action.Create, Policy)).toBe(false);
      expect(ability.can(Action.Read, Policy)).toBe(false);
      expect(ability.can(Action.Update, Policy)).toBe(false);
      expect(ability.can(Action.Delete, Policy)).toBe(true);
    });
  });
});
