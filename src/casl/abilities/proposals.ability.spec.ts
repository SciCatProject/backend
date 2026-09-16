import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { ProposalAbility } from "./proposals.ability";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";

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

describe("ProposalAbility", () => {
  let abilityBuilder: ProposalAbility;

  const unauthenticatedUser = null;

  const authenticatedUser1 = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const authenticatedUser2 = {
    currentGroups: ["group2"],
  } as unknown as JWTUser;

  const proposalUser1 = {
    currentGroups: ["group1", "proposal"],
  } as unknown as JWTUser;

  const proposalUser2 = {
    currentGroups: ["group2", "proposal"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const deleteUser = {
    currentGroups: ["delete"],
  } as unknown as JWTUser;

  const publicProposal = new ProposalClass();
  publicProposal.ownerGroup = "group1";
  publicProposal.isPublished = true;

  const ownedProposal = new ProposalClass();
  ownedProposal.ownerGroup = "group1";

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

  describe("PROPOSAL_GROUPS permissions", () => {
    it("should give correct rights to PROPOSAL_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(proposalUser1);
    });

    it("should give correct rights to PROPOSAL_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(proposalUser2);
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
