import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { InitialDatasetsService } from "src/initial-datasets/initial-datasets.service";
import { LogbooksService } from "src/logbooks/logbooks.service";
import { DatasetsService } from "./datasets.service";
import { DatasetClass } from "./schemas/dataset.schema";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsAccessService } from "./datasets-access.service";
import { Request } from "express";
import { CreateDatasetDto } from "./dto/create-dataset.dto";
import { plainToInstance } from "class-transformer";
import { ProposalsService } from "src/proposals/proposals.service";
import { MetadataKeysService } from "src/metadata-keys/metadatakeys.service";
import { OpensearchService } from "src/opensearch/opensearch.service";
import { REQUEST } from "@nestjs/core";
import { NotFoundException, PreconditionFailedException } from "@nestjs/common";
import { Datablock } from "src/datablocks/schemas/datablock.schema";

class InitialDatasetsServiceMock {}

class LogbooksServiceMock {}

class CaslAbilityFactoryMock {}

class MetadataKeysServiceMock {
  insertManyFromSource = jest.fn().mockResolvedValue([]);
  replaceManyFromSource = jest.fn().mockResolvedValue(undefined);
}

class ProposalsServiceMock {
  incrementNumberOfDatasets = jest.fn().mockResolvedValue(undefined);
  findAll = jest.fn().mockResolvedValue([]);
  count = jest.fn().mockResolvedValue({ count: 0 });
}

const mockDataset: DatasetClass = {
  _id: "testId",
  pid: "testPid",
  owner: "testOwner",
  ownerEmail: "testOwner@email.com",
  instrumentIds: ["testInstrumentId"],
  orcidOfOwner: "https://0000.0000.0000.0001",
  contactEmail: "testContact@email.com",
  sourceFolder: "/nfs/groups/beamlines/test/123456",
  sourceFolderHost: "https://fileserver.site.com",
  size: 1000000,
  packedSize: 1000000,
  numberOfFiles: 1,
  numberOfFilesArchived: 1,
  creationTime: new Date("2021-11-11T12:29:02.083Z"),
  type: "raw",
  validationStatus: "string",
  keywords: [],
  description: "Test dataset.",
  datasetName: "Test Dataset",
  classification: "string",
  license: "string",
  version: "string",
  isPublished: false,
  datasetlifecycle: {
    id: "testId",
    archivable: true,
    retrievable: false,
    publishable: true,
    dateOfDiskPurging: new Date("2031-11-11T12:29:02.083Z"),
    archiveRetentionTime: new Date("2031-11-11T12:29:02.083Z"),
    dateOfPublishing: new Date("2024-11-11T12:29:02.083Z"),
    publishedOn: new Date("2024-11-11T12:29:02.083Z"),
    isOnCentralDisk: true,
    archiveReturnMessage: {},
    retrieveReturnMessage: {},
    archiveStatusMessage: "string",
    retrieveStatusMessage: "string",
    exportedTo: "string",
    retrieveIntegrityCheck: false,
  },
  createdAt: new Date("2021-11-11T12:29:02.083Z"),
  updatedAt: new Date("2021-11-11T12:29:02.083Z"),
  techniques: [],
  principalInvestigators: ["testInvestigator"],
  endTime: new Date("2021-12-11T12:29:02.083Z"),
  creationLocation: "test",
  dataFormat: "Test Format",
  scientificMetadata: {},
  proposalIds: ["ABCDEF"],
  sampleIds: ["testSampleId"],
  accessGroups: [],
  createdBy: "test user",
  ownerGroup: "test",
  relationships: [],
  sharedWith: [],
  updatedBy: "test",
  instrumentGroup: "test",
  inputDatasets: [],
  usedSoftware: [],
  jobParameters: {},
  jobLogData: "",
  comment: "",
  dataQualityMetrics: 1,
};

const mockDatasetModel = function (data: DatasetClass) {
  const doc = {
    ...data,
    toObject: jest.fn().mockReturnValue(data),
  };
  return {
    ...doc,
    save: jest.fn().mockResolvedValue(doc),
  };
};
mockDatasetModel.collection = { name: "Dataset" };

describe("DatasetsService", () => {
  let service: DatasetsService;
  let model: Model<DatasetClass>;
  let proposalsService: ProposalsServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        {
          provide: getModelToken("DatasetClass"),
          useValue: mockDatasetModel,
        },
        DatasetsService,
        DatasetsAccessService,
        {
          provide: InitialDatasetsService,
          useClass: InitialDatasetsServiceMock,
        },
        { provide: LogbooksService, useClass: LogbooksServiceMock },
        { provide: OpensearchService, useValue: null },
        { provide: MetadataKeysService, useClass: MetadataKeysServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
        { provide: ProposalsService, useClass: ProposalsServiceMock },
        { provide: REQUEST, useValue: { user: { username: "tester" } } },
      ],
    }).compile();

    service = await module.resolve<DatasetsService>(DatasetsService);
    model = module.get<Model<DatasetClass>>(getModelToken("DatasetClass"));
    proposalsService = module.get<ProposalsServiceMock>(ProposalsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should encode scientific metadata keys when creating a dataset", async () => {
    const metadata = {
      "Type of.Cleaning": { type: "string", value: "Vacuum Fire", unit: "" },
      "already%20encoded": {
        type: "string",
        value: "Already Encoded",
        unit: "",
      },
    };

    const dtoData = { ...mockDataset, scientificMetadata: metadata };

    const dto = plainToInstance(CreateDatasetDto, dtoData);

    (service as unknown as { request: Request }).request = {
      user: { username: "tester" },
      route: { path: "/datasets" },
    } as unknown as Request;

    const result = await service.create(dto);

    const scientificMetadata = result.scientificMetadata as Record<
      string,
      unknown
    >;

    expect(scientificMetadata).toHaveProperty("Type%20of%2ECleaning");
    expect(scientificMetadata).toHaveProperty("already%20encoded");
    expect(
      (scientificMetadata["Type%20of%2ECleaning"] as { value: unknown }).value,
    ).toBe("Vacuum Fire");
    expect(
      (scientificMetadata["already%20encoded"] as { value: unknown }).value,
    ).toBe("Already Encoded");
  });

  it("should populate proposalIds from matching proposals' ownerGroup for a raw dataset with no proposalIds set", async () => {
    const dtoData = { ...mockDataset, type: "raw", proposalIds: [] };
    const dto = plainToInstance(CreateDatasetDto, dtoData);

    (service as unknown as { request: Request }).request = {
      user: { username: "tester" },
      route: { path: "/datasets" },
    } as unknown as Request;

    proposalsService.count.mockResolvedValueOnce({ count: 2 });
    proposalsService.findAll.mockResolvedValueOnce([
      { proposalId: "20210101.1" },
      { proposalId: "20210101.2" },
    ]);

    const result = await service.create(dto);

    expect(proposalsService.count).toHaveBeenCalledWith({
      where: { ownerGroup: mockDataset.ownerGroup },
    });
    expect(proposalsService.findAll).toHaveBeenCalledWith({
      where: { ownerGroup: mockDataset.ownerGroup },
      limits: { limit: 100 },
    });
    expect(result.proposalIds).toEqual(["20210101.1", "20210101.2"]);
  });

  it("should truncate proposalIds auto-fill when ownerGroup matches too many proposals", async () => {
    const dtoData = { ...mockDataset, type: "raw", proposalIds: [] };
    const dto = plainToInstance(CreateDatasetDto, dtoData);

    (service as unknown as { request: Request }).request = {
      user: { username: "tester" },
      route: { path: "/datasets" },
    } as unknown as Request;

    const cappedProposals = Array.from({ length: 100 }, (_, i) => ({
      proposalId: `20210101.${i}`,
    }));
    proposalsService.count.mockResolvedValueOnce({ count: 101 });
    proposalsService.findAll.mockResolvedValueOnce(cappedProposals);

    const result = await service.create(dto);

    expect(proposalsService.findAll).toHaveBeenCalledWith({
      where: { ownerGroup: mockDataset.ownerGroup },
      limits: { limit: 100 },
    });
    expect(result.proposalIds).toHaveLength(100);
  });

  it("should not look up proposals for a raw dataset that already has proposalIds set", async () => {
    const dtoData = { ...mockDataset, type: "raw" };
    const dto = plainToInstance(CreateDatasetDto, dtoData);

    (service as unknown as { request: Request }).request = {
      user: { username: "tester" },
      route: { path: "/datasets" },
    } as unknown as Request;

    const result = await service.create(dto);

    expect(proposalsService.findAll).not.toHaveBeenCalled();
    expect(result.proposalIds).toEqual(mockDataset.proposalIds);
  });

  it("should not look up proposals for a derived dataset", async () => {
    const dtoData = { ...mockDataset, type: "derived", proposalIds: [] };
    const dto = plainToInstance(CreateDatasetDto, dtoData);

    (service as unknown as { request: Request }).request = {
      user: { username: "tester" },
      route: { path: "/datasets" },
    } as unknown as Request;

    const result = await service.create(dto);

    expect(proposalsService.findAll).not.toHaveBeenCalled();
    expect(result.proposalIds).toEqual([]);
  });

  it("should throw NotFoundException if no document is found", async () => {
    const updateDto = { datasetName: "Updated Name" };
    model.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(null) });
    await expect(
      service.findByIdAndUpdate("testId", updateDto),
    ).rejects.toThrow(NotFoundException);
  });

  it("should throw PreconditionedFailed if no patched dataset is returned (indicating a concurrent modification)", async () => {
    const updateDto = { datasetName: "Updated Name" };
    const unmodifiedSince = new Date("2021-11-11T12:29:02.083Z");
    model.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDataset) });
    model.findOneAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockReturnValue(null) });
    await expect(
      service.findByIdAndUpdate("testId", updateDto, unmodifiedSince),
    ).rejects.toThrow(PreconditionFailedException);
  });

  it("should backfill proposalIds on patch when a raw dataset still has none", async () => {
    const existing = { ...mockDataset, type: "raw", proposalIds: [] };
    model.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });

    const patchedNoProposals = {
      ...existing,
      toObject: jest.fn().mockReturnValue(existing),
    };
    const patchedWithProposals = {
      ...existing,
      proposalIds: ["20260101.1"],
      toObject: jest
        .fn()
        .mockReturnValue({ ...existing, proposalIds: ["20260101.1"] }),
    };
    model.findOneAndUpdate = jest
      .fn()
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(patchedNoProposals),
      })
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(patchedWithProposals),
      });

    proposalsService.count.mockResolvedValueOnce({ count: 1 });
    proposalsService.findAll.mockResolvedValueOnce([
      { proposalId: "20260101.1" },
    ]);

    const result = await service.findByIdAndUpdate("testId", {
      datasetName: "Updated",
    });

    expect(proposalsService.findAll).toHaveBeenCalledWith({
      where: { ownerGroup: existing.ownerGroup },
      limits: { limit: 100 },
    });
    // the proposalIds backfill is a second, atomically-guarded update, not
    // merged into the caller's own patch
    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(model.findOneAndUpdate).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        pid: "testId",
        type: "raw",
        $or: [
          { proposalIds: { $exists: false } },
          { proposalIds: { $size: 0 } },
        ],
      }),
      { $set: { proposalIds: ["20260101.1"] } },
      expect.anything(),
    );
    expect(result?.proposalIds).toEqual(["20260101.1"]);
    expect(proposalsService.incrementNumberOfDatasets).toHaveBeenCalledWith([
      "20260101.1",
    ]);
  });

  it("should not clobber a concurrently-set proposalIds when the guarded backfill no longer matches", async () => {
    const existing = { ...mockDataset, type: "raw", proposalIds: [] };
    model.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(existing) });

    const patchedNoProposals = {
      ...existing,
      toObject: jest.fn().mockReturnValue(existing),
    };
    model.findOneAndUpdate = jest
      .fn()
      .mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(patchedNoProposals),
      })
      // a concurrent write already set proposalIds, so the guarded filter
      // no longer matches and the conditional update returns null
      .mockReturnValueOnce({ exec: jest.fn().mockResolvedValue(null) });

    proposalsService.count.mockResolvedValueOnce({ count: 1 });
    proposalsService.findAll.mockResolvedValueOnce([
      { proposalId: "20260101.1" },
    ]);

    const result = await service.findByIdAndUpdate("testId", {
      datasetName: "Updated",
    });

    expect(model.findOneAndUpdate).toHaveBeenCalledTimes(2);
    expect(result).toEqual(existing);
    expect(proposalsService.incrementNumberOfDatasets).not.toHaveBeenCalled();
  });

  it("should not look up proposals on patch when the dataset already has proposalIds", async () => {
    model.findOne = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(mockDataset) });

    const patched = {
      ...mockDataset,
      toObject: jest.fn().mockReturnValue(mockDataset),
    };
    model.findOneAndUpdate = jest
      .fn()
      .mockReturnValue({ exec: jest.fn().mockResolvedValue(patched) });

    await service.findByIdAndUpdate("testId", { datasetName: "Updated" });

    expect(proposalsService.findAll).not.toHaveBeenCalled();
  });

  describe("updateDatasetSizeAndFiles", () => {
    beforeEach(() => {
      model.updateOne = jest
        .fn()
        .mockReturnValue({ exec: jest.fn().mockResolvedValue(undefined) });
    });

    it("should $inc by the delta between the old and new document", async () => {
      const oldDocument = {
        packedSize: 800,
        dataFileList: [],
      } as unknown as Datablock;
      const newDocument = {
        packedSize: 1000,
        dataFileList: [{}],
      } as unknown as Datablock;

      await service.updateDatasetSizeAndFiles(
        "testPid",
        { size: "packedSize", numberOfFiles: "numberOfFilesArchived" },
        newDocument,
        oldDocument,
      );

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: "testPid" },
        { $inc: { packedSize: 200, numberOfFilesArchived: 1 } },
      );
    });

    it("should treat a missing old document as zero, e.g. on create", async () => {
      const newDocument = {
        packedSize: 1000,
        dataFileList: [{}, {}],
      } as unknown as Datablock;

      await service.updateDatasetSizeAndFiles(
        "testPid",
        { size: "packedSize", numberOfFiles: "numberOfFilesArchived" },
        newDocument,
      );

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: "testPid" },
        { $inc: { packedSize: 1000, numberOfFilesArchived: 2 } },
      );
    });

    it("should treat a missing new document as zero, e.g. on remove", async () => {
      const oldDocument = {
        packedSize: 1000,
        dataFileList: [{}, {}],
      } as unknown as Datablock;

      await service.updateDatasetSizeAndFiles(
        "testPid",
        { size: "packedSize", numberOfFiles: "numberOfFilesArchived" },
        undefined,
        oldDocument,
      );

      expect(model.updateOne).toHaveBeenCalledWith(
        { _id: "testPid" },
        { $inc: { packedSize: -1000, numberOfFilesArchived: -2 } },
      );
    });
  });
});
