import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { ProposalAbility } from "./proposals.ability";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  authenticatedUser2,
  adminUser,
  deleteUser,
  proposalUser1,
  proposalUser2,
  publicProposal,
  ownedProposal,
} from "./test-data.util";

describe("ProposalAbility", () => {
  let abilityBuilder: ProposalAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        ProposalAbility,
      ],
    }).compile();

    abilityBuilder = module.get<ProposalAbility>(ProposalAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);

      expect(ability.can(Action.AccessAny, ProposalClass)).toBe(false);
      expect(ability.can(Action.Create, ProposalClass)).toBe(false);
      expect(ability.can(Action.Create, ownedProposal)).toBe(false);
      expect(ability.can(Action.Read, ProposalClass)).toBe(true);
      expect(ability.can(Action.Read, publicProposal)).toBe(true);
      expect(ability.can(Action.Read, ownedProposal)).toBe(false);
      expect(ability.can(Action.Update, ProposalClass)).toBe(false);
      expect(ability.can(Action.Update, ownedProposal)).toBe(false);
      expect(ability.can(Action.Delete, ProposalClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedProposal)).toBe(false);

      expect(ability.can(Action.ProposalAttachmentCreate, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentCreate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ownedProposal)).toBe(
        false,
      );

      expect(ability.can(Action.ProposalDatasetRead, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalDatasetRead, publicProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalDatasetRead, ownedProposal)).toBe(
        false,
      );
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, ProposalClass)).toBe(false);
      expect(ability.can(Action.Create, ProposalClass)).toBe(false);
      expect(ability.can(Action.Create, ownedProposal)).toBe(false);
      expect(ability.can(Action.Read, ProposalClass)).toBe(true);
      expect(ability.can(Action.Read, publicProposal)).toBe(true);
      expect(ability.can(Action.Read, ownedProposal)).toBe(true);
      expect(ability.can(Action.Update, ProposalClass)).toBe(false);
      expect(ability.can(Action.Update, ownedProposal)).toBe(false);
      expect(ability.can(Action.Delete, ProposalClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedProposal)).toBe(false);

      expect(ability.can(Action.ProposalAttachmentCreate, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentCreate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ownedProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ownedProposal)).toBe(
        false,
      );

      expect(ability.can(Action.ProposalDatasetRead, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalDatasetRead, publicProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalDatasetRead, ownedProposal)).toBe(
        false,
      );
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);

      expect(ability.can(Action.AccessAny, ProposalClass)).toBe(false);
      expect(ability.can(Action.Create, ProposalClass)).toBe(false);
      expect(ability.can(Action.Create, ownedProposal)).toBe(false);
      expect(ability.can(Action.Read, ProposalClass)).toBe(true);
      expect(ability.can(Action.Read, publicProposal)).toBe(true);
      expect(ability.can(Action.Read, ownedProposal)).toBe(false);
      expect(ability.can(Action.Update, ProposalClass)).toBe(false);
      expect(ability.can(Action.Update, ownedProposal)).toBe(false);
      expect(ability.can(Action.Delete, ProposalClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedProposal)).toBe(false);

      expect(ability.can(Action.ProposalAttachmentCreate, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentCreate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ownedProposal)).toBe(
        false,
      );

      expect(ability.can(Action.ProposalDatasetRead, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalDatasetRead, publicProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalDatasetRead, ownedProposal)).toBe(
        false,
      );
    });
  });

  describe("PROPOSAL_GROUPS permissions", () => {
    it("should give correct rights to PROPOSAL_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(proposalUser1);

      expect(ability.can(Action.AccessAny, ProposalClass)).toBe(true);
      expect(ability.can(Action.Create, ProposalClass)).toBe(true);
      expect(ability.can(Action.Create, ownedProposal)).toBe(true);
      expect(ability.can(Action.Read, ProposalClass)).toBe(true);
      expect(ability.can(Action.Read, publicProposal)).toBe(true);
      expect(ability.can(Action.Read, ownedProposal)).toBe(true);
      expect(ability.can(Action.Update, ProposalClass)).toBe(true);
      expect(ability.can(Action.Update, ownedProposal)).toBe(true);
      expect(ability.can(Action.Delete, ProposalClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedProposal)).toBe(false);

      expect(ability.can(Action.ProposalAttachmentCreate, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentCreate, ownedProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ownedProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ownedProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ownedProposal)).toBe(
        true,
      );

      expect(ability.can(Action.ProposalDatasetRead, ProposalClass)).toBe(true);
      expect(ability.can(Action.ProposalDatasetRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalDatasetRead, ownedProposal)).toBe(true);
    });

    it("should give correct rights to PROPOSAL_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(proposalUser2);

      expect(ability.can(Action.AccessAny, ProposalClass)).toBe(true);
      expect(ability.can(Action.Create, ProposalClass)).toBe(true);
      expect(ability.can(Action.Create, ownedProposal)).toBe(true);
      expect(ability.can(Action.Read, ProposalClass)).toBe(true);
      expect(ability.can(Action.Read, publicProposal)).toBe(true);
      expect(ability.can(Action.Read, ownedProposal)).toBe(true);
      expect(ability.can(Action.Update, ProposalClass)).toBe(true);
      expect(ability.can(Action.Update, ownedProposal)).toBe(true);
      expect(ability.can(Action.Delete, ProposalClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedProposal)).toBe(false);

      expect(ability.can(Action.ProposalAttachmentCreate, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentCreate, ownedProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ownedProposal)).toBe(
        false,
      );

      expect(ability.can(Action.ProposalDatasetRead, ProposalClass)).toBe(true);
      expect(ability.can(Action.ProposalDatasetRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalDatasetRead, ownedProposal)).toBe(true);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, ProposalClass)).toBe(true);
      expect(ability.can(Action.Create, ProposalClass)).toBe(true);
      expect(ability.can(Action.Create, ownedProposal)).toBe(true);
      expect(ability.can(Action.Read, ProposalClass)).toBe(true);
      expect(ability.can(Action.Read, publicProposal)).toBe(true);
      expect(ability.can(Action.Read, ownedProposal)).toBe(true);
      expect(ability.can(Action.Update, ProposalClass)).toBe(true);
      expect(ability.can(Action.Update, ownedProposal)).toBe(true);
      expect(ability.can(Action.Delete, ProposalClass)).toBe(false);
      expect(ability.can(Action.Delete, ownedProposal)).toBe(false);

      expect(ability.can(Action.ProposalAttachmentCreate, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentCreate, ownedProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ownedProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ownedProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ownedProposal)).toBe(
        true,
      );

      expect(ability.can(Action.ProposalDatasetRead, ProposalClass)).toBe(true);
      expect(ability.can(Action.ProposalDatasetRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalDatasetRead, ownedProposal)).toBe(true);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);

      expect(ability.can(Action.AccessAny, ProposalClass)).toBe(false);
      expect(ability.can(Action.Create, ProposalClass)).toBe(false);
      expect(ability.can(Action.Create, ownedProposal)).toBe(false);
      expect(ability.can(Action.Read, ProposalClass)).toBe(true);
      expect(ability.can(Action.Read, publicProposal)).toBe(true);
      expect(ability.can(Action.Read, ownedProposal)).toBe(false);
      expect(ability.can(Action.Update, ProposalClass)).toBe(false);
      expect(ability.can(Action.Update, ownedProposal)).toBe(false);
      expect(ability.can(Action.Delete, ProposalClass)).toBe(true);
      expect(ability.can(Action.Delete, ownedProposal)).toBe(true);

      expect(ability.can(Action.ProposalAttachmentCreate, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentCreate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ProposalClass)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, publicProposal)).toBe(
        true,
      );
      expect(ability.can(Action.ProposalAttachmentRead, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentUpdate, ownedProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalAttachmentDelete, ownedProposal)).toBe(
        false,
      );

      expect(ability.can(Action.ProposalDatasetRead, ProposalClass)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalDatasetRead, publicProposal)).toBe(
        false,
      );
      expect(ability.can(Action.ProposalDatasetRead, ownedProposal)).toBe(
        false,
      );
    });
  });
});
