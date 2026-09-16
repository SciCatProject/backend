import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { LogbookAbility } from "./logbooks.ability";

class ConfigServiceMock {
  get = jest.fn((key: string) => {
    if (key === "accessGroups") {
      return {
        admin: ["admin"],
        delete: ["delete"],
        attachment: ["attachment"],
        attachmentPrivileged: ["attachmentPrivileged"],
        createDataset: ["createDataset"],
        createDatasetWithPid: ["createDatasetWithPid"],
        createDatasetPrivileged: ["createDatasetPrivileged"],
        updateDatasetLifecycle: ["updateDatasetLifecycle"],
        historyProposal: ["historyProposal"],
        historyDataset: ["historyDataset"],
        historySample: ["historySample"],
        historyInstrument: ["historyInstrument"],
        historyPublishedData: ["historyPublishedData"],
        historyPolicies: ["historyPolicies"],
        historyDatablocks: ["historyDatablocks"],
        historyAttachments: ["historyAttachments"],
        createJobPrivileged: ["createJobPrivileged"],
        updateJobPrivileged: ["updateJpbPrivileged"],
        deleteJob: ["deleteJob"],
        policy: ["policy"],
        proposal: ["proposal"],
        sample: ["sample"],
        samplePrivileged: ["samplePrivileged"],
      } as AccessGroupsType;
    }
    return null;
  });
}

describe("LogbookAbility", () => {
  let abilityBuilder: LogbookAbility;

  const unauthenticatedUser = null;

  const authenticatedUser = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        LogbookAbility,
      ],
    }).compile();

    abilityBuilder = module.get<LogbookAbility>(LogbookAbility);
  });

  it("should be defined", () => {
    expect(abilityBuilder).toBeDefined();
  });

  describe("Unauthenticated permissions", () => {
    it("should give correct rights to unauthenticated users", () => {
      const ability = abilityBuilder.buildAbility(unauthenticatedUser);
    });
  });

  describe("Authenticated permissions", () => {
    it("should give correct rights to authenticated users", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser);
    });
  });
});
