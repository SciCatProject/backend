import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { LogbookAbility } from "./logbooks.ability";

describe("LogbookAbility", () => {
  let ability: LogbookAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [LogbookAbility],
    }).compile();

    ability = module.get<LogbookAbility>(LogbookAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});
});
