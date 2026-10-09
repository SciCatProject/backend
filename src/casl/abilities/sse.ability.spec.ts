import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { SseAbility } from "./sse.ability";
import { SseClass } from "src/serverSentEvent/interfaces/sse-event.interface";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  adminUser,
} from "./test-data.util";

describe("SseAbility", () => {
  let abilityBuilder: SseAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        SseAbility,
      ],
    }).compile();

    abilityBuilder = module.get<SseAbility>(SseAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, SseClass)).toBe(false);
      expect(ability.can(Action.Read, SseClass)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, SseClass)).toBe(false);
      expect(ability.can(Action.Read, SseClass)).toBe(true);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, SseClass)).toBe(true);
      expect(ability.can(Action.Read, SseClass)).toBe(true);
    });
  });
});
