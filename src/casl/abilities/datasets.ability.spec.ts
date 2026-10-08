import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { DatasetAbility } from "./datasets.ability";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
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
  updateDatasetLifecycleUser,
  publicDataset,
  ownedDataset,
  ownedDatasetPid,
} from "./test-data.util";

describe("DatasetAbility", () => {
  let abilityBuilder: DatasetAbility;

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
