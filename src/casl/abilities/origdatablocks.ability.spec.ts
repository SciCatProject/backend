import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { OrigDatablockAbility } from "./origdatablocks.ability";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";

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

describe("OrigDatablockAbility", () => {
  let abilityBuilder: OrigDatablockAbility;

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

  const publicOrigdatablock = new OrigDatablock();
  publicOrigdatablock.ownerGroup = "group1";
  publicOrigdatablock.isPublished = true;

  const ownedOrigdatablock = new OrigDatablock();
  ownedOrigdatablock.ownerGroup = "group1";

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
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);
    });
  });

  describe("CREATE_DATASET_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser1);
    });

    it("should give correct rights to CREATE_DATASET_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetUser2);
    });
  });

  describe("CREATE_DATASET_WITH_PID_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser1);
    });

    it("should give correct rights to CREATE_DATASET_WITH_PID_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetWithPidUser2);
    });
  });

  describe("CREATE_DATASET_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser1);
    });

    it("should give correct rights to CREATE_DATASET_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(createDatasetPrivilegedUser2);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);
    });
  });
});
