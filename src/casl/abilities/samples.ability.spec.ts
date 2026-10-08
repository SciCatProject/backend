import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { SampleAbility } from "./samples.ability";
import { SampleClass } from "src/samples/schemas/sample.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  authenticatedUser2,
  adminUser,
  deleteUser,
  sampleUser1,
  sampleUser2,
  samplePrivilegedUser1,
  samplePrivilegedUser2,
  publicSample,
  ownedSample,
} from "./test-data.util";

describe("SampleAbility", () => {
  let abilityBuilder: SampleAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        SampleAbility,
      ],
    }).compile();

    abilityBuilder = module.get<SampleAbility>(SampleAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, ownedSample)).toBe(false);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(false);
      expect(ability.can(Action.Update, SampleClass)).toBe(false);
      expect(ability.can(Action.Update, ownedSample)).toBe(false);
      expect(ability.can(Action.Delete, SampleClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedSample)).toBe(false);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(false);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        false,
      );
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, ownedSample)).toBe(false);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(true);
      expect(ability.can(Action.Update, SampleClass)).toBe(false);
      expect(ability.can(Action.Update, ownedSample)).toBe(false);
      expect(ability.can(Action.Delete, SampleClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedSample)).toBe(false);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        false,
      );
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, ownedSample)).toBe(false);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(false);
      expect(ability.can(Action.Update, SampleClass)).toBe(false);
      expect(ability.can(Action.Update, ownedSample)).toBe(false);
      expect(ability.can(Action.Delete, SampleClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedSample)).toBe(false);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(false);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        false,
      );
    });
  });

  describe("SAMPLE_GROUPS permissions", () => {
    it("should give correct rights to SAMPLE_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(sampleUser1);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, SampleClass)).toBe(true);
      expect(ability.can(Action.Create, ownedSample)).toBe(true);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(true);
      expect(ability.can(Action.Update, SampleClass)).toBe(true);
      expect(ability.can(Action.Update, ownedSample)).toBe(true);
      expect(ability.can(Action.Delete, SampleClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedSample)).toBe(false);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        true,
      );
    });

    it("should give correct rights to SAMPLE_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(sampleUser2);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, SampleClass)).toBe(true);
      expect(ability.can(Action.Create, ownedSample)).toBe(false);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(false);
      expect(ability.can(Action.Update, SampleClass)).toBe(true);
      expect(ability.can(Action.Update, ownedSample)).toBe(false);
      expect(ability.can(Action.Delete, SampleClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedSample)).toBe(false);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(false);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        false,
      );
    });
  });

  describe("SAMPLE_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to SAMPLE_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(samplePrivilegedUser1);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, SampleClass)).toBe(true);
      expect(ability.can(Action.Create, ownedSample)).toBe(true);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(true);
      expect(ability.can(Action.Update, SampleClass)).toBe(true);
      expect(ability.can(Action.Update, ownedSample)).toBe(true);
      expect(ability.can(Action.Delete, SampleClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedSample)).toBe(false);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        true,
      );
    });

    it("should give correct rights to SAMPLE_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(samplePrivilegedUser2);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, SampleClass)).toBe(true);
      expect(ability.can(Action.Create, ownedSample)).toBe(true);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(false);
      expect(ability.can(Action.Update, SampleClass)).toBe(true);
      expect(ability.can(Action.Update, ownedSample)).toBe(false);
      expect(ability.can(Action.Delete, SampleClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedSample)).toBe(false);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(false);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        false,
      );
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(true);
      expect(ability.can(Action.Create, SampleClass)).toBe(true);
      expect(ability.can(Action.Create, ownedSample)).toBe(true);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(true);
      expect(ability.can(Action.Update, SampleClass)).toBe(true);
      expect(ability.can(Action.Update, ownedSample)).toBe(true);
      expect(ability.can(Action.Delete, SampleClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedSample)).toBe(false);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        true,
      );
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, SampleClass)).toBe(false);
      expect(ability.can(Action.Create, ownedSample)).toBe(false);
      expect(ability.can(Action.Read, SampleClass)).toBe(true);
      expect(ability.can(Action.Read, publicSample)).toBe(true);
      expect(ability.can(Action.Read, ownedSample)).toBe(false);
      expect(ability.can(Action.Update, SampleClass)).toBe(false);
      expect(ability.can(Action.Update, ownedSample)).toBe(false);
      expect(ability.can(Action.Delete, SampleClass)).toBe(true);
      expect(ability.can(Action.Delete, ownedSample)).toBe(true);

      expect(ability.can(Action.SampleAttachmentCreate, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentCreate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentRead, SampleClass)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, publicSample)).toBe(true);
      expect(ability.can(Action.SampleAttachmentRead, ownedSample)).toBe(false);
      expect(ability.can(Action.SampleAttachmentUpdate, SampleClass)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentUpdate, ownedSample)).toBe(
        false,
      );
      expect(ability.can(Action.SampleAttachmentDelete, SampleClass)).toBe(
        true,
      );
      expect(ability.can(Action.SampleAttachmentDelete, ownedSample)).toBe(
        true,
      );
    });
  });
});
