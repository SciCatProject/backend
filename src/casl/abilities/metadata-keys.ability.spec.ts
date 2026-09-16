import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { MetadataKeyAbility } from "./metadata-keys.ability";
import { MetadataKeyClass } from "src/metadata-keys/schemas/metadatakey.schema";

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

describe("MetadataKeyAbility", () => {
  let abilityBuilder: MetadataKeyAbility;

  const unauthenticatedUser = null;

  const authenticatedUser1 = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const authenticatedUser2 = {
    currentGroups: ["group2"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const publicMetadataKey = new MetadataKeyClass();
  publicMetadataKey.userGroups = ["group1"];
  publicMetadataKey.isPublished = true;

  const ownedMetadataKey = new MetadataKeyClass();
  ownedMetadataKey.userGroups = ["group1"];

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

      expect(ability.can(Action.MetadataKeyRead, MetadataKeyClass)).toBe(true);
      expect(ability.can(Action.MetadataKeyRead, publicMetadataKey)).toBe(true);
      expect(ability.can(Action.MetadataKeyRead, ownedMetadataKey)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.MetadataKeyRead, MetadataKeyClass)).toBe(true);
      expect(ability.can(Action.MetadataKeyRead, publicMetadataKey)).toBe(true);
      expect(ability.can(Action.MetadataKeyRead, ownedMetadataKey)).toBe(true);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.MetadataKeyRead, MetadataKeyClass)).toBe(true);
      expect(ability.can(Action.MetadataKeyRead, publicMetadataKey)).toBe(true);
      expect(ability.can(Action.MetadataKeyRead, ownedMetadataKey)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.MetadataKeyRead, MetadataKeyClass)).toBe(true);
      expect(ability.can(Action.MetadataKeyRead, publicMetadataKey)).toBe(true);
      expect(ability.can(Action.MetadataKeyRead, ownedMetadataKey)).toBe(true);
    });
  });
});
