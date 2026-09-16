import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "../action.enum";
import { SampleAbility } from "./samples.ability";
import { SampleClass } from "src/samples/schemas/sample.schema";

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
        updateJobPrivileged: ["updateJobPrivileged"],
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

describe("SampleAbility", () => {
  let abilityBuilder: SampleAbility;

  const unauthenticatedUser = null;

  const authenticatedUser1 = {
    currentGroups: ["group1"],
  } as unknown as JWTUser;

  const authenticatedUser2 = {
    currentGroups: ["group2"],
  } as unknown as JWTUser;

  const sampleUser1 = {
    currentGroups: ["group1", "sample"],
  } as unknown as JWTUser;

  const sampleUser2 = {
    currentGroups: ["group2", "sample"],
  } as unknown as JWTUser;

  const samplePrivilegedUser1 = {
    currentGroups: ["group1", "samplePrivileged"],
  } as unknown as JWTUser;

  const samplePrivilegedUser2 = {
    currentGroups: ["group2", "samplePrivileged"],
  } as unknown as JWTUser;

  const adminUser = {
    currentGroups: ["admin"],
  } as unknown as JWTUser;

  const deleteUser = {
    currentGroups: ["delete"],
  } as unknown as JWTUser;

  const publicSample = new SampleClass();
  publicSample.ownerGroup = "group1";
  publicSample.isPublished = true;

  const ownedSample = new SampleClass();
  ownedSample.ownerGroup = "group1";

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: ConfigService, useClass: ConfigServiceMock },
        SampleAbility,
      ],
    }).compile();

    abilityBuilder = module.get<SampleAbility>(SampleAbility);
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
    it("should give correct rights to authenticated users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser1);
    });

    it("should give correct rights to authenticated users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(authenticatedUser2);
    });
  });

  describe("SAMPLE_GROUPS permissions", () => {
    it("should give correct rights to SAMPLE_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(sampleUser1);
    });

    it("should give correct rights to SAMPLE_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(sampleUser2);
    });
  });

  describe("SAMPLE_PRIVILEGED_GROUPS permissions", () => {
    it("should give correct rights to SAMPLE_PRIVILEGED_GROUPS users that own the resource", () => {
      const ability = abilityBuilder.buildAbility(samplePrivilegedUser1);
    });

    it("should give correct rights to SAMPLE_PRIVILEGED_GROUPS users that don't own the resource", () => {
      const ability = abilityBuilder.buildAbility(samplePrivilegedUser2);
    });
  });

  describe("ADMIN_GROUPS permissions", () => {
    it("should give correct rights to ADMIN_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(adminUser);
    });
  });

  describe("DELETE_GROUPS permissions", () => {
    it("should give correct rights to DELETE_GROUPS users", () => {
      const ability = abilityBuilder.buildAbility(deleteUser);
    });
  });
});
