import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { OpensearchAbility } from "./opensearch.ability";

describe("OpensearchAbility", () => {
  let abilityBuilder: OpensearchAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [OpensearchAbility],
    }).compile();

    abilityBuilder = module.get<OpensearchAbility>(OpensearchAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});
});
