import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { HistoryAbility } from "./history.ability";

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
        historyPolicies: ["historyPolicy"],
        historyDatablocks: ["historyDatablock"],
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

describe("HistoryAbility", () => {
  let abilityBuilder: HistoryAbility;

  const unauthenticatedUser = null;

  const authenticatedUser = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const historyAttachmentUser = {
    currentGroups: ["historyAttachment"],
  } as unknown as JWTUser;

  const historyDatablockUser = {
    currentGroups: ["historyDatablock"],
  } as unknown as JWTUser;

  const historyDatasetUser = {
    currentGroups: ["historyDataset"],
  } as unknown as JWTUser;

  const historyInstrumentUser = {
    currentGroups: ["historyInstrument"],
  } as unknown as JWTUser;

  const historyPolicyUser = {
    currentGroups: ["historyPolicy"],
  } as unknown as JWTUser;

  const historyProposalUser = {
    currentGroups: ["historyProposal"],
  } as unknown as JWTUser;

  const historyPublishedDataUser = {
    currentGroups: ["historyPublishedData"],
  } as unknown as JWTUser;

  const historySampleUser = {
    currentGroups: ["historySample"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        HistoryAbility,
      ],
    }).compile();

    abilityBuilder = module.get<HistoryAbility>(HistoryAbility);
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
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser);
    });
  });

  describe("HISTORY_ACCESS_ATTACHMENT_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_ATTACHMENT_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyAttachmentUser);
    });
  });

  describe("HISTORY_ACCESS_DATABLOCK_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_DATABLOCK_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyDatablockUser);
    });
  });

  describe("HISTORY_ACCESS_DATASET_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_DATASET_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyDatasetUser);
    });
  });

  describe("HISTORY_ACCESS_INSTRUMENT_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_INSTRUMENT_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyInstrumentUser);
    });
  });

  describe("HISTORY_ACCESS_POLICIES_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_POLICIES_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyPolicyUser);
    });
  });

  describe("HISTORY_ACCESS_PROPOSAL_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_PROPOSAL_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyProposalUser);
    });
  });

  describe("HISTORY_ACCESS_PUBLISHED_DATA_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_PUBLISHED_DATA_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyPublishedDataUser);
    });
  });

  describe("HISTORY_ACCESS_SAMPLE_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_SAMPLE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historySampleUser);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);
    });
  });
});
