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
      expect(ability.can(Action.UserCreate, User)).toBe(false);
      expect(ability.can(Action.UserCreate, user1)).toBe(false);
      expect(ability.can(Action.UserCreate, userAdmin)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, User)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, user1)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, userAdmin)).toBe(false);
      expect(ability.can(Action.UserRead, User)).toBe(false);
      expect(ability.can(Action.UserRead, user1)).toBe(false);
      expect(ability.can(Action.UserRead, userAdmin)).toBe(false);
      expect(ability.can(Action.UserUpdate, User)).toBe(false);
      expect(ability.can(Action.UserUpdate, user1)).toBe(false);
      expect(ability.can(Action.UserUpdate, userAdmin)).toBe(false);
      expect(ability.can(Action.UserDelete, User)).toBe(false);
      expect(ability.can(Action.UserDelete, user1)).toBe(false);
      expect(ability.can(Action.UserDelete, userAdmin)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, User)).toBe(false);
      expect(ability.can(Action.UserCreate, User)).toBe(true);
      expect(ability.can(Action.UserCreate, user1)).toBe(true);
      expect(ability.can(Action.UserCreate, userAdmin)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, User)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, user1)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, userAdmin)).toBe(false);
      expect(ability.can(Action.UserRead, User)).toBe(true);
      expect(ability.can(Action.UserRead, user1)).toBe(true);
      expect(ability.can(Action.UserRead, userAdmin)).toBe(false);
      expect(ability.can(Action.UserUpdate, User)).toBe(true);
      expect(ability.can(Action.UserUpdate, user1)).toBe(true);
      expect(ability.can(Action.UserUpdate, userAdmin)).toBe(false);
      expect(ability.can(Action.UserDelete, User)).toBe(true);
      expect(ability.can(Action.UserDelete, user1)).toBe(true);
      expect(ability.can(Action.UserDelete, userAdmin)).toBe(false);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, User)).toBe(false);
      expect(ability.can(Action.UserCreate, User)).toBe(true);
      expect(ability.can(Action.UserCreate, user1)).toBe(false);
      expect(ability.can(Action.UserCreate, userAdmin)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, User)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, user1)).toBe(false);
      expect(ability.can(Action.UserCreateJwt, userAdmin)).toBe(false);
      expect(ability.can(Action.UserRead, User)).toBe(true);
      expect(ability.can(Action.UserRead, user1)).toBe(false);
      expect(ability.can(Action.UserRead, userAdmin)).toBe(false);
      expect(ability.can(Action.UserUpdate, User)).toBe(true);
      expect(ability.can(Action.UserUpdate, user1)).toBe(false);
      expect(ability.can(Action.UserUpdate, userAdmin)).toBe(false);
      expect(ability.can(Action.UserDelete, User)).toBe(true);
      expect(ability.can(Action.UserDelete, user1)).toBe(false);
      expect(ability.can(Action.UserDelete, userAdmin)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, User)).toBe(true);
      expect(ability.can(Action.UserCreate, User)).toBe(true);
      expect(ability.can(Action.UserCreate, user1)).toBe(true);
      expect(ability.can(Action.UserCreate, userAdmin)).toBe(true);
      expect(ability.can(Action.UserCreateJwt, User)).toBe(true);
      expect(ability.can(Action.UserCreateJwt, user1)).toBe(true);
      expect(ability.can(Action.UserCreateJwt, userAdmin)).toBe(true);
      expect(ability.can(Action.UserRead, User)).toBe(true);
      expect(ability.can(Action.UserRead, user1)).toBe(true);
      expect(ability.can(Action.UserRead, userAdmin)).toBe(true);
      expect(ability.can(Action.UserUpdate, User)).toBe(true);
      expect(ability.can(Action.UserUpdate, user1)).toBe(true);
      expect(ability.can(Action.UserUpdate, userAdmin)).toBe(true);
      expect(ability.can(Action.UserDelete, User)).toBe(true);
      expect(ability.can(Action.UserDelete, user1)).toBe(true);
      expect(ability.can(Action.UserDelete, userAdmin)).toBe(true);
    });
  });
});
