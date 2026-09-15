import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { ProposalAbility } from "./proposals.ability";

describe("ProposalAbility", () => {
  let ability: ProposalAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [ProposalAbility],
    }).compile();

    ability = module.get<ProposalAbility>(ProposalAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("PROPOSAL_GROUPS permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_GROUPS permissions", () => {});
});
