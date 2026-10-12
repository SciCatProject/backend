import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { UserAbility } from "./users.ability";
import { User } from "src/users/schemas/user.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  authenticatedUser2,
  adminUser,
  user1,
  userAdmin,
} from "./test-data.util";

describe("UserAbility", () => {
  let abilityBuilder: UserAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        UserAbility,
      ],
    }).compile();

    abilityBuilder = module.get<UserAbility>(UserAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, User)).toBe(false);
      expect(ability.can(Action.Create, User)).toBe(false);
      expect(ability.can(Action.Create, user1)).toBe(false);
      expect(ability.can(Action.Create, userAdmin)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, User)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, user1)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, userAdmin)).toBe(false);
      expect(ability.can(Action.Read, User)).toBe(false);
      expect(ability.can(Action.Read, user1)).toBe(false);
      expect(ability.can(Action.Read, userAdmin)).toBe(false);
      expect(ability.can(Action.Update, User)).toBe(false);
      expect(ability.can(Action.Update, user1)).toBe(false);
      expect(ability.can(Action.Update, userAdmin)).toBe(false);
      expect(ability.can(Action.Delete, User)).toBe(false);
      expect(ability.can(Action.Delete, user1)).toBe(false);
      expect(ability.can(Action.Delete, userAdmin)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, User)).toBe(false);
      expect(ability.can(Action.Create, User)).toBe(true);
      expect(ability.can(Action.Create, user1)).toBe(true);
      expect(ability.can(Action.Create, userAdmin)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, User)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, user1)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, userAdmin)).toBe(false);
      expect(ability.can(Action.Read, User)).toBe(true);
      expect(ability.can(Action.Read, user1)).toBe(true);
      expect(ability.can(Action.Read, userAdmin)).toBe(false);
      expect(ability.can(Action.Update, User)).toBe(true);
      expect(ability.can(Action.Update, user1)).toBe(true);
      expect(ability.can(Action.Update, userAdmin)).toBe(false);
      expect(ability.can(Action.Delete, User)).toBe(true);
      expect(ability.can(Action.Delete, user1)).toBe(true);
      expect(ability.can(Action.Delete, userAdmin)).toBe(false);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, User)).toBe(false);
      expect(ability.can(Action.Create, User)).toBe(true);
      expect(ability.can(Action.Create, user1)).toBe(false);
      expect(ability.can(Action.Create, userAdmin)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, User)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, user1)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, userAdmin)).toBe(false);
      expect(ability.can(Action.Read, User)).toBe(true);
      expect(ability.can(Action.Read, user1)).toBe(false);
      expect(ability.can(Action.Read, userAdmin)).toBe(false);
      expect(ability.can(Action.Update, User)).toBe(true);
      expect(ability.can(Action.Update, user1)).toBe(false);
      expect(ability.can(Action.Update, userAdmin)).toBe(false);
      expect(ability.can(Action.Delete, User)).toBe(true);
      expect(ability.can(Action.Delete, user1)).toBe(false);
      expect(ability.can(Action.Delete, userAdmin)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, User)).toBe(true);
      expect(ability.can(Action.Create, User)).toBe(true);
      expect(ability.can(Action.Create, user1)).toBe(true);
      expect(ability.can(Action.Create, userAdmin)).toBe(true);
      expect(ability.can(Action.UserCreateJwt, User)).toBe(true);
      expect(ability.can(Action.UserCreateJwt, user1)).toBe(true);
      expect(ability.can(Action.UserCreateJwt, userAdmin)).toBe(true);
      expect(ability.can(Action.Read, User)).toBe(true);
      expect(ability.can(Action.Read, user1)).toBe(true);
      expect(ability.can(Action.Read, userAdmin)).toBe(true);
      expect(ability.can(Action.Update, User)).toBe(true);
      expect(ability.can(Action.Update, user1)).toBe(true);
      expect(ability.can(Action.Update, userAdmin)).toBe(true);
      expect(ability.can(Action.Delete, User)).toBe(true);
      expect(ability.can(Action.Delete, user1)).toBe(true);
      expect(ability.can(Action.Delete, userAdmin)).toBe(true);
    });
  });
});
