import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { UserAbility } from "./users.ability";

describe("UserAbility", () => {
  let ability: UserAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [UserAbility],
    }).compile();

    ability = module.get<UserAbility>(UserAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});
});
