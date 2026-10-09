import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { InstrumentAbility } from "./instruments.ability";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  adminUser,
  deleteUser,
} from "./test-data.util";

describe("InstrumentAbility", () => {
  let abilityBuilder: InstrumentAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        InstrumentAbility,
      ],
    }).compile();

    abilityBuilder = module.get<InstrumentAbility>(InstrumentAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.Create, Instrument)).toBe(false);
      expect(ability.can(Action.Read, Instrument)).toBe(true);
      expect(ability.can(Action.Update, Instrument)).toBe(false);
      expect(ability.can(Action.Delete, Instrument)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.Create, Instrument)).toBe(false);
      expect(ability.can(Action.Read, Instrument)).toBe(true);
      expect(ability.can(Action.Update, Instrument)).toBe(false);
      expect(ability.can(Action.Delete, Instrument)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.Create, Instrument)).toBe(true);
      expect(ability.can(Action.Read, Instrument)).toBe(true);
      expect(ability.can(Action.Update, Instrument)).toBe(true);
      expect(ability.can(Action.Delete, Instrument)).toBe(false);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.Create, Instrument)).toBe(false);
      expect(ability.can(Action.Read, Instrument)).toBe(true);
      expect(ability.can(Action.Update, Instrument)).toBe(false);
      expect(ability.can(Action.Delete, Instrument)).toBe(true);
    });
  });
});
