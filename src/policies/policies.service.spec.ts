import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
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
  tapeRedundancy: "low",
  autoArchive: true,
  autoArchiveDelay: 7,
  archiveEmailNotification: true,
  archiveEmailsToBeNotified: [],
  retrieveEmailNotification: true,
  retrieveEmailsToBeNotified: [],
  embargoPeriod: 3,
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let policyModel: Model<Policy>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        PoliciesService,
        { provide: UsersService, useClass: UsersServiceMock },
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

    service = module.get<PoliciesService>(PoliciesService);
    policyModel = module.get<Model<Policy>>(getModelToken("Policy"));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
