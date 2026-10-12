import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { AttachmentAbility } from "./attachments.ability";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  authenticatedUser2,
  adminUser,
  deleteUser,
  attachmentUser1,
  attachmentUser2,
  attachmentPrivilegedUser1,
  attachmentPrivilegedUser2,
  publicAttachment,
  ownedAttachment,
} from "./test-data.util";

describe("AttachmentAbility", () => {
  let abilityBuilder: AttachmentAbility;

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

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.Create, Attachment)).toBe(false);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Update, Attachment)).toBe(false);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Delete, Attachment)).toBe(false);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.Create, Attachment)).toBe(false);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Update, Attachment)).toBe(false);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Delete, Attachment)).toBe(false);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(false);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.Create, Attachment)).toBe(false);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Update, Attachment)).toBe(false);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Delete, Attachment)).toBe(false);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(false);
    });
  });

  describe("ATTACHMENT_GROUPS permissions", () => {
    it("should give correct rights to ATTACHMENT_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentUser1);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.Create, Attachment)).toBe(true);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Update, Attachment)).toBe(true);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Delete, Attachment)).toBe(true);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(true);
    });

    it("should give correct rights to ATTACHMENT_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentUser2);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.Create, Attachment)).toBe(true);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Update, Attachment)).toBe(true);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Delete, Attachment)).toBe(true);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(false);
    });
  });

  describe("ATTACHMENT_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to ATTACHMENT_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentPrivilegedUser1);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.Create, Attachment)).toBe(true);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Update, Attachment)).toBe(true);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Delete, Attachment)).toBe(true);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(true);
    });

    it("should give correct rights to ATTACHMENT_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentPrivilegedUser2);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.Create, Attachment)).toBe(true);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Update, Attachment)).toBe(true);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Delete, Attachment)).toBe(true);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(true);
      expect(ability.can(Action.Create, Attachment)).toBe(true);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Update, Attachment)).toBe(true);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(true);
      expect(ability.can(Action.Delete, Attachment)).toBe(true);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(true);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.Create, Attachment)).toBe(false);
      expect(ability.can(Action.Create, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Read, Attachment)).toBe(true);
      expect(ability.can(Action.Read, publicAttachment)).toBe(true);
      expect(ability.can(Action.Read, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Update, Attachment)).toBe(false);
      expect(ability.can(Action.Update, ownedAttachment)).toBe(false);
      expect(ability.can(Action.Delete, Attachment)).toBe(true);
      expect(ability.can(Action.Delete, ownedAttachment)).toBe(true);
    });
  });
});
