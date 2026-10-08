import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { OrigDatablockAbility } from "./origdatablocks.ability";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  authenticatedUser2,
  adminUser,
  deleteUser,
  createDatasetUser1,
  createDatasetUser2,
  createDatasetWithPidUser1,
  createDatasetWithPidUser2,
  createDatasetPrivilegedUser1,
  createDatasetPrivilegedUser2,
  publicOrigdatablock,
  ownedOrigdatablock,
} from "./test-data.util";

describe("OrigDatablockAbility", () => {
  let abilityBuilder: OrigDatablockAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        OrigDatablockAbility,
      ],
    }).compile();

    abilityBuilder = module.get<OrigDatablockAbility>(OrigDatablockAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });
  });

  describe("CREATE_DATASET_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser1);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });

    it("should give correct rights to CREATE_DATASET_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser2);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });
  });

  describe("CREATE_DATASET_WITH_PID_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser1);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });

    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser2);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });
  });

  describe("CREATE_DATASET_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser1);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });

    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser2);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        false,
      );
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, OrigDatablock)).toBe(false);
      expect(ability.can(Action.OrigdatablockCreate, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockCreate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockRead, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockRead, publicOrigdatablock)).toBe(
        true,
      );
      expect(ability.can(Action.OrigdatablockRead, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, OrigDatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockUpdate, ownedOrigdatablock)).toBe(
        false,
      );
      expect(ability.can(Action.OrigdatablockDelete, OrigDatablock)).toBe(true);
      expect(ability.can(Action.OrigdatablockDelete, ownedOrigdatablock)).toBe(
        true,
      );
    });
  });
});
