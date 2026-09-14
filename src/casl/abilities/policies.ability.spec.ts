import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { PolicyAbility } from "./policies.ability";

describe("PolicyAbility", () => {
  let abilityBuilder: PolicyAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [PolicyAbility],
    }).compile();

    abilityBuilder = module.get<PolicyAbility>(PolicyAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("POLICY_GROUPS permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_GROUPS permissions", () => {});
});
