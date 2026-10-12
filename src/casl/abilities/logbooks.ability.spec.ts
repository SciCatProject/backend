import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { LogbookAbility } from "./logbooks.ability";
import { Logbook } from "src/logbooks/schemas/logbook.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
} from "./test-data.util";

describe("LogbookAbility", () => {
  let abilityBuilder: LogbookAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        LogbookAbility,
      ],
    }).compile();

    abilityBuilder = module.get<LogbookAbility>(LogbookAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.Read, Logbook)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.Read, Logbook)).toBe(true);
    });
  });
});
