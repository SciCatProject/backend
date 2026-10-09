import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { OpensearchAbility } from "./opensearch.ability";
import { Opensearch } from "src/opensearch/opensearch.subject";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  adminUser,
} from "./test-data.util";

describe("OpensearchAbility", () => {
  let abilityBuilder: OpensearchAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        OpensearchAbility,
      ],
    }).compile();

    abilityBuilder = module.get<OpensearchAbility>(OpensearchAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.Manage, Opensearch)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.Manage, Opensearch)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.Manage, Opensearch)).toBe(true);
    });
  });
});
