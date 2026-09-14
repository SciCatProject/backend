import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { LogbookAbility } from "./logbooks.ability";

describe("LogbookAbility", () => {
  let abilityBuilder: LogbookAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [LogbookAbility],
    }).compile();

    abilityBuilder = module.get<LogbookAbility>(LogbookAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});
});
