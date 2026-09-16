import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { AttachmentAbility } from "./attachments.ability";
import { Attachment } from "src/attachments/schemas/attachment.schema";

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
        historyProposal: ["historyProposal"],
        historyDataset: ["historyDataset"],
        historySample: ["historySample"],
        historyInstrument: ["historyInstrument"],
        historyPublishedData: ["historyPublishedData"],
        historyPolicies: ["historyPolicies"],
        historyDatablocks: ["historyDatablocks"],
        historyAttachments: ["historyAttachments"],
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

describe("AttachmentAbility", () => {
  let abilityBuilder: AttachmentAbility;

  const unauthenticatedUser = null;

  const authenticatedUser1 = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const authenticatedUser2 = {
    currentGroups: ["group2"],
  } as unknown as JWTUser;

  const attachmentUser1 = {
    currentGroups: ["group1", "attachment"],
  } as unknown as JWTUser;

  const attachmentUser2 = {
    currentGroups: ["group2", "attachment"],
  } as unknown as JWTUser;

  const attachmentPrivilegedUser1 = {
    currentGroups: ["group1", "attachmentPrivileged"],
  } as unknown as JWTUser;

  const attachmentPrivilegedUser2 = {
    currentGroups: ["group2", "attachmentPrivileged"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const deleteUser = {
    currentGroups: ["delete"],
  } as unknown as JWTUser;

  const publicAttachment = new Attachment();
  publicAttachment.ownerGroup = "group1";
  publicAttachment.isPublished = true;

  const ownedAttachment = new Attachment();
  ownedAttachment.ownerGroup = "group1";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        AttachmentAbility,
      ],
    }).compile();

    abilityBuilder = module.get<AttachmentAbility>(AttachmentAbility);
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

  describe("ATTACHMENT_GROUPS permissions", () => {
    it("should give correct rights to ATTACHMENT_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentUser1);
    });

    it("should give correct rights to ATTACHMENT_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentUser2);
    });
  });

  describe("ATTACHMENT_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to ATTACHMENT_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentPrivilegedUser1);
    });

    it("should give correct rights to ATTACHMENT_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentPrivilegedUser2);
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
