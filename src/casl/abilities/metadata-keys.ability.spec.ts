import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { MetadataKeyAbility } from "./metadata-keys.ability";
import { MetadataKeyClass } from "src/metadata-keys/schemas/metadatakey.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  authenticatedUser2,
  adminUser,
  publicMetadataKey,
  ownedMetadataKey,
} from "./test-data.util";

describe("MetadataKeyAbility", () => {
  let abilityBuilder: MetadataKeyAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        MetadataKeyAbility,
      ],
    }).compile();

    abilityBuilder = module.get<MetadataKeyAbility>(MetadataKeyAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.Read, MetadataKeyClass)).toBe(true);
      expect(ability.can(Action.Read, publicMetadataKey)).toBe(true);
      expect(ability.can(Action.Read, ownedMetadataKey)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.Read, MetadataKeyClass)).toBe(true);
      expect(ability.can(Action.Read, publicMetadataKey)).toBe(true);
      expect(ability.can(Action.Read, ownedMetadataKey)).toBe(true);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.Read, MetadataKeyClass)).toBe(true);
      expect(ability.can(Action.Read, publicMetadataKey)).toBe(true);
      expect(ability.can(Action.Read, ownedMetadataKey)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.Read, MetadataKeyClass)).toBe(true);
      expect(ability.can(Action.Read, publicMetadataKey)).toBe(true);
      expect(ability.can(Action.Read, ownedMetadataKey)).toBe(true);
    });
  });
});
