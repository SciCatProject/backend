import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { SseAbility } from "./sse.ability";

describe("SseAbility", () => {
  let abilityBuilder: SseAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [SseAbility],
    }).compile();

    abilityBuilder = module.get<SseAbility>(SseAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});
});
