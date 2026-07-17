import { NotFoundException } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { DatasetsService } from "src/datasets/datasets.service";
import { DatablocksService } from "./datablocks.service";
import { CreateDatablockDto } from "./dto/create-datablock.dto";
import { Datablock } from "./schemas/datablock.schema";

const mockDatablock: Datablock = {
  _id: "testId",
  datasetId: "testPid",
  archiveId: "testArchiveId",
  size: 1000,
  packedSize: 1000,
  chkAlg: "testChkAlg",
  version: "testVersion",
  ownerGroup: "testOwner",
  accessGroups: ["testAccess"],
  instrumentGroup: "testInstrument",
  createdBy: "testUser",
  updatedBy: "testUser",
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublished: false,
  dataFileList: [
    {
      path: "testFile.hdf5",
      size: 1000,
      time: new Date(),
      chk: "testChk",
      uid: "testUid",
      gid: "testGid",
      perm: "testPerm",
      metadata: {
        key: "value",
      },
    },
  ],
};

const mockCreateDatablockDto: CreateDatablockDto = {
  datasetId: mockDatablock.datasetId,
  archiveId: mockDatablock.archiveId,
  size: mockDatablock.size,
  packedSize: mockDatablock.packedSize,
  chkAlg: mockDatablock.chkAlg,
  version: mockDatablock.version,
  ownerGroup: mockDatablock.ownerGroup,
  accessGroups: mockDatablock.accessGroups,
  instrumentGroup: mockDatablock.instrumentGroup,
  dataFileList: mockDatablock.dataFileList,
};

class DatasetsServiceMock {
  updateDatasetSizeAndFiles = jest.fn().mockResolvedValue(undefined);
}

function MockDatablockModel(
  this: Record<string, unknown>,
  data: Record<string, unknown>,
) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue({ ...mockDatablock, ...data });
}
MockDatablockModel.find = jest.fn();
MockDatablockModel.findOne = jest.fn();
MockDatablockModel.findOneAndUpdate = jest.fn();
MockDatablockModel.findOneAndDelete = jest.fn();
MockDatablockModel.deleteMany = jest.fn();
MockDatablockModel.countDocuments = jest.fn();

describe("DatablocksService", () => {
  let service: DatablocksService;
  let model: Model<Datablock>;
  let datasetsService: DatasetsServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DatablocksService,
        {
          provide: getModelToken("Datablock"),
          useValue: MockDatablockModel,
        },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: REQUEST, useValue: { user: { username: "testUser" } } },
      ],
    }).compile();

    service = await module.resolve<DatablocksService>(DatablocksService);
    model = module.get<Model<Datablock>>(getModelToken("Datablock"));
    datasetsService = module.get<DatasetsServiceMock>(DatasetsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should save a datablock stamped with the requesting user", async () => {
      const result = await service.create(mockCreateDatablockDto);

      expect(result).toEqual(
        expect.objectContaining({
          createdBy: "testUser",
          updatedBy: "testUser",
          datasetId: mockCreateDatablockDto.datasetId,
        }),
      );
    });
  });

  describe("updateDatasetSizeAndFiles", () => {
    it("should delegate to the datasets service using the datablock model and its packedSize/numberOfFilesArchived fields", async () => {
      await service.updateDatasetSizeAndFiles("testPid");

      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        "testPid",
        model,
        "packedSize",
        "numberOfFilesArchived",
      );
    });
  });

  describe("createAndUpdateDatasetSizeAndFileCount", () => {
    it("should create the datablock and then update the dataset size and file count", async () => {
      const result = await service.createAndUpdateDatasetSizeAndFileCount(
        mockCreateDatablockDto,
      );

      expect(result).toEqual(
        expect.objectContaining({
          datasetId: mockCreateDatablockDto.datasetId,
        }),
      );
      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        mockCreateDatablockDto.datasetId,
        model,
        "packedSize",
        "numberOfFilesArchived",
      );
    });
  });

  describe("updateAndUpdateDatasetSizeAndFileCount", () => {
    it("should update the datablock and then update the dataset size and file count", async () => {
      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDatablock),
      });

      const result = await service.updateAndUpdateDatasetSizeAndFileCount(
        { _id: "testId" },
        { size: 2000 },
      );

      expect(result).toEqual(mockDatablock);
      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        mockDatablock.datasetId,
        model,
        "packedSize",
        "numberOfFilesArchived",
      );
    });

    it("should throw NotFoundException and not touch the dataset when the datablock does not exist", async () => {
      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateAndUpdateDatasetSizeAndFileCount(
          { _id: "missing" },
          { size: 2000 },
        ),
      ).rejects.toThrow(NotFoundException);
      expect(datasetsService.updateDatasetSizeAndFiles).not.toHaveBeenCalled();
    });
  });

  describe("removeAndUpdateDatasetSizeAndFileCount", () => {
    it("should remove the datablock and then update the dataset size and file count", async () => {
      (model.findOneAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDatablock),
      });

      const result = await service.removeAndUpdateDatasetSizeAndFileCount(
        { _id: "testId" },
        "testPid",
      );

      expect(result).toEqual(mockDatablock);
      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        "testPid",
        model,
        "packedSize",
        "numberOfFilesArchived",
      );
    });

    it("should throw NotFoundException and not touch the dataset when the datablock does not exist", async () => {
      (model.findOneAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.removeAndUpdateDatasetSizeAndFileCount(
          { _id: "missing" },
          "testPid",
        ),
      ).rejects.toThrow(NotFoundException);
      expect(datasetsService.updateDatasetSizeAndFiles).not.toHaveBeenCalled();
    });
  });
});
