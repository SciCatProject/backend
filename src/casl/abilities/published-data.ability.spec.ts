import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { PublishedDataAbility } from "./published-data.ability";
import { PublishedData } from "src/published-data/schemas/published-data.schema";

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

describe("PublishedDataAbility", () => {
  let abilityBuilder: PublishedDataAbility;

  const unauthenticatedUser = null;

  const authenticatedUser = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const deleteUser = {
    currentGroups: ["delete"],
  } as unknown as JWTUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        PublishedDataAbility,
      ],
    }).compile();

    abilityBuilder = module.get<PublishedDataAbility>(PublishedDataAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, PublishedData)).toBe(false);
      expect(ability.can(Action.Create, PublishedData)).toBe(false);
      expect(ability.can(Action.Read, PublishedData)).toBe(false);
      expect(ability.can(Action.Update, PublishedData)).toBe(false);
      expect(ability.can(Action.Delete, PublishedData)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser);

      expect(ability.can(Action.AccessAny, PublishedData)).toBe(false);
      expect(ability.can(Action.Create, PublishedData)).toBe(true);
      expect(ability.can(Action.Read, PublishedData)).toBe(true);
      expect(ability.can(Action.Update, PublishedData)).toBe(true);
      expect(ability.can(Action.Delete, PublishedData)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, PublishedData)).toBe(true);
      expect(ability.can(Action.Create, PublishedData)).toBe(true);
      expect(ability.can(Action.Read, PublishedData)).toBe(true);
      expect(ability.can(Action.Update, PublishedData)).toBe(true);
      expect(ability.can(Action.Delete, PublishedData)).toBe(false);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, PublishedData)).toBe(false);
      expect(ability.can(Action.Create, PublishedData)).toBe(true);
      expect(ability.can(Action.Read, PublishedData)).toBe(true);
      expect(ability.can(Action.Update, PublishedData)).toBe(true);
      expect(ability.can(Action.Delete, PublishedData)).toBe(true);
    });
  });
});
