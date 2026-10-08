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
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(false);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(false);
    });
  });

  describe("ATTACHMENT_GROUPS permissions", () => {
    it("should give correct rights to ATTACHMENT_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentUser1);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(true);
    });

    it("should give correct rights to ATTACHMENT_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentUser2);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(false);
    });
  });

  describe("ATTACHMENT_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to ATTACHMENT_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentPrivilegedUser1);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(true);
    });

    it("should give correct rights to ATTACHMENT_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(attachmentPrivilegedUser2);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(false);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(true);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentCreate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentRead, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, publicAttachment)).toBe(true);
      expect(ability.can(Action.AttachmentRead, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, Attachment)).toBe(false);
      expect(ability.can(Action.AttachmentUpdate, ownedAttachment)).toBe(false);
      expect(ability.can(Action.AttachmentDelete, Attachment)).toBe(true);
      expect(ability.can(Action.AttachmentDelete, ownedAttachment)).toBe(true);
    });
  });
});
