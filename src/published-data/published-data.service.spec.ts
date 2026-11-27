import { Logger } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { PublishedDataService } from "./published-data.service";
import { PublishedData } from "./schemas/published-data.schema";
import { PublishedDataStatus } from "./interfaces/published-data.interface";
import { ConfigService } from "@nestjs/config";

const mockPublishedData: PublishedData = {
  doi: "100.10/random-test-uuid-string",
  _id: "100.10/random-test-uuid-string",
  pid: "100.10/random-test-uuid-string",
  metadata: {
    creators: ["Test Creator"],
    publisher: "Test publisher",
    publicationYear: 2022,
    url: "https://host.com",
    resourceType: "Test resourceType",
    contributors: [{ name: "Test Contributor" }],
    relatedItems: [{ titles: [{ title: "Related Item Title" }] }],
  },
  title: "Test Title",
  abstract: "Test abstract",
  numberOfFiles: 1,
  sizeOfArchive: 1000000,
  datasetPids: ["100.10/test-pid-uuid-string"],
  registeredTime: new Date("2022-02-15T13:00:00"),
  status: PublishedDataStatus.REGISTERED,
  createdAt: new Date("2022-02-15T13:00:00"),
  updatedAt: new Date("2022-02-15T13:00:00"),
  createdBy: "testUser",
  updatedBy: "testUser",
};

describe("PublishedDataService", () => {
  let service: PublishedDataService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let model: Model<PublishedData>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PublishedDataService,
        {
          provide: getModelToken("PublishedData"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockPublishedData),
            constructor: jest.fn().mockResolvedValue(mockPublishedData),
            find: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        ConfigService,
      ],
    }).compile();

    service = await module.resolve<PublishedDataService>(PublishedDataService);
    model = module.get<Model<PublishedData>>(getModelToken("PublishedData"));
    Logger.error = jest.fn();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
