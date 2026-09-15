import { Test, TestingModule } from "@nestjs/testing";
import { ConfigModule } from "@nestjs/config";
import { AttachmentAbility } from "./attachments.ability";

describe("AttachmentAbility", () => {
  let ability: AttachmentAbility;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      providers: [AttachmentAbility],
    }).compile();

    ability = module.get<AttachmentAbility>(AttachmentAbility);
  });

  it("should be defined", () => {
    expect(ability).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {});

  describe("Authenticated permissions", () => {});

  describe("ATTACHMENT_GROUPS permissions", () => {});

  describe("ATTACHMENT_PRIVILEGED_GROUPS permissions", () => {});

  describe("ADMIN_GROUPS permissions", () => {});

  describe("DELETE_GROUPS permissions", () => {});
});
