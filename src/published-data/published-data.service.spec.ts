import { Logger } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { PublishedDataService } from "./published-data.service";
import { PublishedData } from "./schemas/published-data.schema";
import { PublishedDataStatus } from "./interfaces/published-data.interface";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";

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
  proposalIds: [],
  sampleIds: [],
  instrumentIds: [],
  registeredTime: new Date("2022-02-15T13:00:00"),
  status: PublishedDataStatus.REGISTERED,
  createdAt: new Date("2022-02-15T13:00:00"),
  updatedAt: new Date("2022-02-15T13:00:00"),
  createdBy: "testUser",
  updatedBy: "testUser",
};

describe("PublishedDataService", () => {
  let service: PublishedDataService;
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
            findOne: jest.fn(),
            findOneAndUpdate: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        { provide: REQUEST, useValue: { user: { username: "testUser" } } },
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

  it("allows status-only updates for legacy documents without resource IDs", async () => {
    const legacyPublishedData = {
      ...mockPublishedData,
      datasetPids: [],
      proposalIds: [],
      sampleIds: [],
      instrumentIds: [],
    };
    const findOneAndUpdate = model.findOneAndUpdate as jest.Mock;
    const findOne = model.findOne as jest.Mock;

    findOne.mockReturnValue({
      exec: jest.fn().mockResolvedValue(legacyPublishedData),
    });
    findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(legacyPublishedData),
    });

    await expect(
      service.update(
        { doi: legacyPublishedData.doi },
        { status: PublishedDataStatus.PUBLIC },
      ),
    ).resolves.toEqual(legacyPublishedData);
    expect(findOneAndUpdate).toHaveBeenCalled();
    expect(findOne).not.toHaveBeenCalled();
  });

  it("adds an atomic guard when clearing a resource ID field", async () => {
    const findOneAndUpdate = model.findOneAndUpdate as jest.Mock;
    const findOne = model.findOne as jest.Mock;
    const filter = { doi: mockPublishedData.doi };
    const updatedPublishedData = {
      ...mockPublishedData,
      datasetPids: [],
    };

    findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedPublishedData),
    });

    await expect(service.update(filter, { datasetPids: [] })).resolves.toEqual(
      updatedPublishedData,
    );

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      {
        $and: [
          filter,
          {
            $or: [
              { proposalIds: { $elemMatch: { $regex: /\S/ } } },
              { sampleIds: { $elemMatch: { $regex: /\S/ } } },
              { instrumentIds: { $elemMatch: { $regex: /\S/ } } },
            ],
          },
        ],
      },
      expect.anything(),
      expect.anything(),
    );
    expect(findOne).not.toHaveBeenCalled();
  });

  it("normalizes null resource IDs before persisting an update", async () => {
    const findOneAndUpdate = model.findOneAndUpdate as jest.Mock;
    const updatedPublishedData = {
      ...mockPublishedData,
      datasetPids: [],
    };

    findOneAndUpdate.mockReturnValue({
      exec: jest.fn().mockResolvedValue(updatedPublishedData),
    });

    await expect(
      service.update(
        { doi: mockPublishedData.doi },
        { datasetPids: null as unknown as string[] },
      ),
    ).resolves.toEqual(updatedPublishedData);

    expect(findOneAndUpdate).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        $set: expect.objectContaining({ datasetPids: [] }),
      }),
      expect.anything(),
    );
  });

  it("rejects blank resource IDs before persisting an update", async () => {
    const findOneAndUpdate = model.findOneAndUpdate as jest.Mock;

    await expect(
      service.update(
        { doi: mockPublishedData.doi },
        { datasetPids: ["", "valid-dataset"] },
      ),
    ).rejects.toThrow("Resource ID arrays must contain only non-blank strings");
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects an update that explicitly leaves all resource IDs empty", async () => {
    const findOneAndUpdate = model.findOneAndUpdate as jest.Mock;

    const request = service.update(
      { doi: mockPublishedData.doi },
      {
        datasetPids: [],
        proposalIds: [],
        sampleIds: [],
        instrumentIds: [],
      },
    );

    await expect(request).rejects.toMatchObject({
      response: {
        message:
          "At least one of datasetPids, proposalIds, sampleIds, or instrumentIds must contain at least one non-empty element",
        code: "NO_RESOURCE_IDS_PROVIDED",
        requiredFields: [
          "datasetPids",
          "proposalIds",
          "sampleIds",
          "instrumentIds",
        ],
      },
    });
    expect(findOneAndUpdate).not.toHaveBeenCalled();
  });
});
