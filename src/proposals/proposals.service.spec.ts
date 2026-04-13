import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { ProposalsService } from "./proposals.service";
import { ProposalClass } from "./schemas/proposal.schema";

const mockProposal: ProposalClass = {
  proposalId: "ABCDEF",
  _id: "ABCDEF",
  pi_email: "testPi@email.com",
  pi_firstname: "testPiFirstname",
  pi_lastname: "testPiLastname",
  email: "testName@email.com",
  firstname: "testFirstname",
  lastname: "testLastname",
  title: "Test Proposal Title",
  abstract: "Test abstract.",
  startTime: new Date(),
  endTime: new Date(),
  ownerGroup: "testOwnerGroup",
  accessGroups: ["testAccessGroup"],
  instrumentGroup: "testInstrument",
  createdBy: "proposalIngestor",
  updatedBy: "proposalIngestor",
  MeasurementPeriodList: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublished: false,
};

describe("ProposalsService", () => {
  let service: ProposalsService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let model: Model<ProposalClass>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsService,
        {
          provide: getModelToken("ProposalClass"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockProposal),
            constructor: jest.fn().mockResolvedValue(mockProposal),
            find: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = await module.resolve<ProposalsService>(ProposalsService);
    model = module.get<Model<ProposalClass>>(getModelToken("ProposalClass"));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
