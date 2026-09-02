import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { REQUEST } from "@nestjs/core";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { DatasetsService } from "src/datasets/datasets.service";
import { UsersService } from "src/users/users.service";
import { PoliciesService } from "./policies.service";
import { Policy } from "./schemas/policy.schema";

class DatasetsServiceMock {}
class UsersServiceMock {}

const mockPolicy: Policy = {
  _id: "testId",
  manager: ["test@email.com"],
  jobPolicies: {
    archive: {
      emailTo: [],
      tapeRedundancy: "low",
      autoArchive: true,
      autoArchiveDelay: 7,
    },
  },
  ownerGroup: "testOwnerGroup",
  accessGroups: ["testAccessGroup"],
  instrumentGroup: "testInstrument",
  createdBy: "testUser",
  updatedBy: "testUser",
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublished: false,
};

describe("PoliciesService", () => {
  let service: PoliciesService;
  let policyModel: Model<Policy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        PoliciesService,
        { provide: UsersService, useClass: UsersServiceMock },
        { provide: REQUEST, useValue: { user: { username: "tester" } } },
        {
          provide: getModelToken("Policy"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockPolicy),
            constructor: jest.fn().mockResolvedValue(mockPolicy),
            find: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = await module.resolve<PoliciesService>(PoliciesService);
    policyModel = module.get<Model<Policy>>(getModelToken("Policy"));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("update", () => {
    const mockFindOneAndUpdate = (): jest.Mock => {
      const exec = jest.fn().mockResolvedValue(mockPolicy);
      const findOneAndUpdate = jest.fn().mockReturnValue({ exec });
      policyModel.findOneAndUpdate =
        findOneAndUpdate as unknown as Model<Policy>["findOneAndUpdate"];
      return findOneAndUpdate;
    };

    it("0100: sets a field to null on a merge-patch null", async () => {
      const findOneAndUpdate = mockFindOneAndUpdate();

      await service.update(
        { _id: "testId" },
        { instrumentGroup: null } as unknown as Partial<Policy>,
        undefined,
        true,
      );

      const [, updateDoc] = findOneAndUpdate.mock.calls[0];
      expect(updateDoc.$set.instrumentGroup).toBeNull();
    });

    it("0110: drops null fields entirely on a plain application/json patch", async () => {
      const findOneAndUpdate = mockFindOneAndUpdate();

      await service.update(
        { _id: "testId" },
        { instrumentGroup: null } as unknown as Partial<Policy>,
        undefined,
        false,
      );

      const [, updateDoc] = findOneAndUpdate.mock.calls[0];
      expect(updateDoc.$set).not.toHaveProperty("instrumentGroup");
    });

    it("0120: flattens nested jobPolicies fields to dot paths without touching siblings", async () => {
      const findOneAndUpdate = mockFindOneAndUpdate();

      await service.update(
        { _id: "testId" },
        {
          jobPolicies: { archive: { tapeRedundancy: "high" } },
        } as unknown as Partial<Policy>,
        undefined,
        false,
      );

      const [, updateDoc] = findOneAndUpdate.mock.calls[0];
      expect(updateDoc.$set["jobPolicies.archive.tapeRedundancy"]).toBe("high");
      expect(updateDoc.$set).not.toHaveProperty("jobPolicies");
    });
  });
});
