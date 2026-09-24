import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { DatasetAbility } from "./datasets.ability";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";

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

describe("DatasetAbility", () => {
  let abilityBuilder: DatasetAbility;

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

  const updateDatasetLifecycleUser = {
    currentGroups: ["updateDatasetLifecycle"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const deleteUser = {
    currentGroups: ["delete"],
  } as unknown as JWTUser;

  const publicDataset = new DatasetClass();
  publicDataset.pid = "";
  publicDataset.ownerGroup = "group1";
  publicDataset.isPublished = true;

  const ownedDataset = new DatasetClass();
  ownedDataset.pid = "";
  ownedDataset.ownerGroup = "group1";

  const ownedDatasetPid = new DatasetClass();
  ownedDatasetPid.pid = "123456789";
  ownedDatasetPid.ownerGroup = "group1";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        DatasetAbility,
      ],
    }).compile();

    abilityBuilder = module.get<DatasetAbility>(DatasetAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(false);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(false);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(true);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(false);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(false);
    });
  });

  describe("CREATE_DATASET_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser1);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(false);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        true,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(true);
    });

    it("should give correct rights to CREATE_DATASET_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser2);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(false);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(false);
    });
  });

  describe("CREATE_DATASET_WITH_PID_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser1);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(true);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        true,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(true);
    });

    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser2);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(false);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(false);
    });
  });

  describe("CREATE_DATASET_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser1);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(true);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        true,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(true);
    });

    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser2);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(true);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(false);
    });
  });

  describe("UPDATE_DATASET_LIFECYCLE_GROUPS permissions", () => {
    it("should give correct rights to UPDATE_DATASET_LIFECYCLE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(updateDatasetLifecycleUser);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(false);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(true);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(false);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        true,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(true);
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        false,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(true);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetCreate, ownedDatasetPid)).toBe(false);
      expect(ability.can(Action.DatasetRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetRead, publicDataset)).toBe(true);
      expect(ability.can(Action.DatasetRead, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, DatasetClass)).toBe(false);
      expect(ability.can(Action.DatasetUpdate, ownedDataset)).toBe(false);
      expect(ability.can(Action.DatasetLifecycleUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetLifecycleUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDelete, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDelete, ownedDataset)).toBe(true);

      expect(ability.can(Action.DatasetAttachmentCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetAttachmentDelete, ownedDataset)).toBe(
        true,
      );

      expect(ability.can(Action.DatasetDatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetDatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetDatablockDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetDatablockDelete, ownedDataset)).toBe(
        true,
      );

      expect(ability.can(Action.DatasetOrigdatablockCreate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockCreate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, publicDataset)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockRead, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, DatasetClass)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockUpdate, ownedDataset)).toBe(
        false,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, DatasetClass)).toBe(
        true,
      );
      expect(ability.can(Action.DatasetOrigdatablockDelete, ownedDataset)).toBe(
        true,
      );

      expect(ability.can(Action.DatasetLogbookRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.DatasetLogbookRead, ownedDataset)).toBe(false);
    });
  });
});
