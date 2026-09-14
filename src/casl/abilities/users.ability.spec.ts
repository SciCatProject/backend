import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { UserAbility } from "./users.ability";

describe("UserAbility", () => {
  let abilityBuilder: UserAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [UserAbility],
    }).compile();

    abilityBuilder = module.get<UserAbility>(UserAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});
});
