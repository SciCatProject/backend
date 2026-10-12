import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { DatablockAbility } from "./datablocks.ability";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
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
  publicDatablock,
  ownedDatablock,
} from "./test-data.util";

describe("DatablockAbility", () => {
  let abilityBuilder: DatablockAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        DatablockAbility,
      ],
    }).compile();

    abilityBuilder = module.get<DatablockAbility>(DatablockAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(false);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Update, Datablock)).toBe(false);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(false);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(false);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });
  });

  describe("CREATE_DATASET_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser1);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(true);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });

    it("should give correct rights to CREATE_DATASET_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser2);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(true);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });
  });

  describe("CREATE_DATASET_WITH_PID_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser1);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(true);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });

    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser2);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(true);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });
  });

  describe("CREATE_DATASET_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser1);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(true);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });

    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser2);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(true);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(true);
      expect(ability.can(Action.Create, Datablock)).toBe(true);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(false);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(false);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.Create, Datablock)).toBe(false);
      expect(ability.can(Action.Create, ownedDatablock)).toBe(false);
      expect(ability.can(Action.Read, Datablock)).toBe(true);
      expect(ability.can(Action.Read, publicDatablock)).toBe(true);
      expect(ability.can(Action.Read, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Update, Datablock)).toBe(true);
      expect(ability.can(Action.Update, ownedDatablock)).toBe(true);
      expect(ability.can(Action.Delete, Datablock)).toBe(true);
      expect(ability.can(Action.Delete, ownedDatablock)).toBe(true);
    });
  });
});
