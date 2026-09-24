import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { DatablockAbility } from "./datablocks.ability";
import { Datablock } from "src/datablocks/schemas/datablock.schema";

class ConfigServiceMock {
  get = jest.fn((key: string) => {
    if (key === "accessGroups") {
      return {
        admin: ["admin"],
        delete: ["delete"],
        attachment: ["attachment"],
        attachmentPrivileged: ["attachmentPrivileged"],
        createDataset: ["createDataset"],
        createDatasetWithPid: ["createDatasetWithPid"],
        createDatasetPrivileged: ["createDatasetPrivileged"],
        updateDatasetLifecycle: ["updateDatasetLifecycle"],
        historyAttachments: ["historyAttachment"],
        historyDatablocks: ["historyDatablock"],
        historyDataset: ["historyDataset"],
        historyInstrument: ["historyInstrument"],
        historyPolicies: ["historyPolicy"],
        historyProposal: ["historyProposal"],
        historyPublishedData: ["historyPublishedData"],
        historySample: ["historySample"],
        createJobPrivileged: ["createJobPrivileged"],
        updateJobPrivileged: ["updateJobPrivileged"],
        deleteJob: ["deleteJob"],
        policy: ["policy"],
        proposal: ["proposal"],
        sample: ["sample"],
        samplePrivileged: ["samplePrivileged"],
      } as AccessGroupsType;
    }
    return null;
  });
}

describe("DatablockAbility", () => {
  let abilityBuilder: DatablockAbility;

  const unauthenticatedUser = null;

  const authenticatedUser1 = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const authenticatedUser2 = {
    currentGroups: ["group2"],
  } as unknown as JWTUser;

  const createDatasetUser1 = {
    currentGroups: ["group1", "createDataset"],
  } as unknown as JWTUser;

  const createDatasetUser2 = {
    currentGroups: ["group2", "createDataset"],
  } as unknown as JWTUser;

  const createDatasetWithPidUser1 = {
    currentGroups: ["group1", "createDatasetWithPid"],
  } as unknown as JWTUser;

  const createDatasetWithPidUser2 = {
    currentGroups: ["group2", "createDatasetWithPid"],
  } as unknown as JWTUser;

  const createDatasetPrivilegedUser1 = {
    currentGroups: ["group1", "createDatasetPrivileged"],
  } as unknown as JWTUser;

  const createDatasetPrivilegedUser2 = {
    currentGroups: ["group2", "createDatasetPrivileged"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const deleteUser = {
    currentGroups: ["delete"],
  } as unknown as JWTUser;

  const publicDatablock = new Datablock();
  publicDatablock.ownerGroup = "group1";
  publicDatablock.isPublished = true;

  const ownedDatablock = new Datablock();
  ownedDatablock.ownerGroup = "group1";

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
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });
  });

  describe("CREATE_DATASET_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser1);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });

    it("should give correct rights to CREATE_DATASET_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser2);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });
  });

  describe("CREATE_DATASET_WITH_PID_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser1);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });

    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser2);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });
  });

  describe("CREATE_DATASET_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser1);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });

    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser2);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(false);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, Datablock)).toBe(false);
      expect(ability.can(Action.DatablockCreate, ownedDatablock)).toBe(false);
      expect(ability.can(Action.DatablockRead, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, publicDatablock)).toBe(true);
      expect(ability.can(Action.DatablockRead, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockUpdate, ownedDatablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, Datablock)).toBe(true);
      expect(ability.can(Action.DatablockDelete, ownedDatablock)).toBe(true);
    });
  });
});
