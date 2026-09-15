import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { InstrumentAbility } from "./instruments.ability";

describe("InstrumentAbility", () => {
  let ability: InstrumentAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [InstrumentAbility],
    }).compile();

    ability = module.get<InstrumentAbility>(InstrumentAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_GROUPS permissions", () => {});
});
