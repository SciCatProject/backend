import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Action } from "../action.enum";
import { HistoryAbility } from "./history.ability";
import { GenericHistory } from "src/common/schemas/generic-history.schema";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { Policy } from "src/policies/schemas/policy.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";
import {
  ConfigServiceMock,
  unauthenticatedUser,
  authenticatedUser1,
  adminUser,
  historyAttachmentUser,
  historyDatablockUser,
  historyDatasetUser,
  historyInstrumentUser,
  historyPolicyUser,
  historyProposalUser,
  historyPublishedDataUser,
  historySampleUser,
} from "./test-data.util";

describe("HistoryAbility", () => {
  let abilityBuilder: HistoryAbility;

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

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("HISTORY_ACCESS_ATTACHMENT_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_ATTACHMENT_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyAttachmentUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(true);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("HISTORY_ACCESS_DATABLOCK_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_DATABLOCK_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyDatablockUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(true);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("HISTORY_ACCESS_DATASET_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_DATASET_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyDatasetUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("HISTORY_ACCESS_INSTRUMENT_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_INSTRUMENT_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyInstrumentUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(true);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("HISTORY_ACCESS_POLICIES_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_POLICIES_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyPolicyUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(true);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("HISTORY_ACCESS_PROPOSAL_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_PROPOSAL_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyProposalUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(true);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("HISTORY_ACCESS_PUBLISHED_DATA_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_PUBLISHED_DATA_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historyPublishedDataUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(true);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(false);
    });
  });

  describe("HISTORY_ACCESS_SAMPLE_GROUPS permissions", () => {
    it("should give correct rights to HISTORY_ACCESS_SAMPLE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(historySampleUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(false);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(false);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(false);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(false);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(false);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(false);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(false);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(true);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);

      expect(ability.can(Action.AccessAny, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, GenericHistory)).toBe(true);
      expect(ability.can(Action.HistoryRead, Attachment)).toBe(true);
      expect(ability.can(Action.HistoryRead, Datablock)).toBe(true);
      expect(ability.can(Action.HistoryRead, DatasetClass)).toBe(true);
      expect(ability.can(Action.HistoryRead, Instrument)).toBe(true);
      expect(ability.can(Action.HistoryRead, Policy)).toBe(true);
      expect(ability.can(Action.HistoryRead, ProposalClass)).toBe(true);
      expect(ability.can(Action.HistoryRead, PublishedData)).toBe(true);
      expect(ability.can(Action.HistoryRead, SampleClass)).toBe(true);
    });
  });
});
