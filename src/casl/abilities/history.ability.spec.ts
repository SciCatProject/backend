import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { HistoryAbility } from "./history.ability";

describe("HistoryAbility", () => {
  let ability: HistoryAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [HistoryAbility],
    }).compile();

    ability = module.get<HistoryAbility>(HistoryAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("HISTORY_ACCESS_ATTACHMENT_GROUPS permissions", () => {});

  describe("HISTORY_ACCESS_DATABLOCK_GROUPS permissions", () => {});

  describe("HISTORY_ACCESS_DATASET_GROUPS permissions", () => {});

  describe("HISTORY_ACCESS_INSTRUMENT_GROUPS permissions", () => {});

  describe("HISTORY_ACCESS_POLICIES_GROUPS permissions", () => {});

  describe("HISTORY_ACCESS_PROPOSAL_GROUPS permissions", () => {});

  describe("HISTORY_ACCESS_PUBLISHED_DATA_GROUPS permissions", () => {});

  describe("HISTORY_ACCESS_SAMPLE_GROUPS permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});
});
