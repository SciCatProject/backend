import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { PublishedDataAbility } from "./published-data.ability";
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  adminUser,
  deleteUser,
} from "./test-data.util";

describe("PublishedDataAbility", () => {
  let abilityBuilder: PublishedDataAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        PublishedDataAbility,
      ],
    }).compile();

    abilityBuilder = module.get<PublishedDataAbility>(PublishedDataAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, PublishedData)).toBe(false);
      expect(ability.can(Action.Create, PublishedData)).toBe(false);
      expect(ability.can(Action.Read, PublishedData)).toBe(false);
      expect(ability.can(Action.Update, PublishedData)).toBe(false);
      expect(ability.can(Action.Delete, PublishedData)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, PublishedData)).toBe(false);
      expect(ability.can(Action.Create, PublishedData)).toBe(true);
      expect(ability.can(Action.Read, PublishedData)).toBe(true);
      expect(ability.can(Action.Update, PublishedData)).toBe(true);
      expect(ability.can(Action.Delete, PublishedData)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, PublishedData)).toBe(true);
      expect(ability.can(Action.Create, PublishedData)).toBe(true);
      expect(ability.can(Action.Read, PublishedData)).toBe(true);
      expect(ability.can(Action.Update, PublishedData)).toBe(true);
      expect(ability.can(Action.Delete, PublishedData)).toBe(false);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, PublishedData)).toBe(false);
      expect(ability.can(Action.Create, PublishedData)).toBe(true);
      expect(ability.can(Action.Read, PublishedData)).toBe(true);
      expect(ability.can(Action.Update, PublishedData)).toBe(true);
      expect(ability.can(Action.Delete, PublishedData)).toBe(true);
    });
  });
});
