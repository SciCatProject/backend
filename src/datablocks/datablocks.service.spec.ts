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
        "packedSize",
        "numberOfFilesArchived",
        result,
        undefined,
      );
    });
  });

  describe("updateOneAndUpdateDatasetSizeAndFileCount", () => {
    const oldDatablock: Datablock = {
      ...mockDatablock,
      packedSize: 800,
      dataFileList: [],
    };

    it("should update the datablock and then update the dataset size and file count by the delta", async () => {
      (model.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(oldDatablock),
      });
      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDatablock),
      });

      const result = await service.updateOneAndUpdateDatasetSizeAndFileCount(
        { _id: "testId" },
        { packedSize: mockDatablock.packedSize },
      );

      expect(result).toEqual(mockDatablock);
      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        mockDatablock.datasetId,
        "packedSize",
        "numberOfFilesArchived",
        mockDatablock,
        oldDatablock,
      );
    });

    it("should throw NotFoundException and not touch the dataset when the original datablock does not exist", async () => {
      (model.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateOneAndUpdateDatasetSizeAndFileCount(
          { _id: "missing" },
          { size: 2000 },
        ),
      ).rejects.toThrow(NotFoundException);
      expect(model.findOneAndUpdate).not.toHaveBeenCalled();
      expect(datasetsService.updateDatasetSizeAndFiles).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException and not touch the dataset when the datablock disappears during update", async () => {
      (model.findOne as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(oldDatablock),
      });
      (model.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.updateOneAndUpdateDatasetSizeAndFileCount(
          { _id: "testId" },
          { size: 2000 },
        ),
      ).rejects.toThrow(NotFoundException);
      expect(datasetsService.updateDatasetSizeAndFiles).not.toHaveBeenCalled();
    });
  });

  describe("removeAndUpdateDatasetSizeAndFileCount", () => {
    it("should remove the datablock and then update the dataset size and file count with negated values", async () => {
      (model.findOneAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockDatablock),
      });

      const result = await service.removeAndUpdateDatasetSizeAndFileCount({
        _id: "testId",
      });

      expect(result).toEqual(mockDatablock);
      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        "testPid",
        "packedSize",
        "numberOfFilesArchived",
        undefined,
        mockDatablock,
      );
    });

    it("should throw NotFoundException and not touch the dataset when the datablock does not exist", async () => {
      (model.findOneAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.removeAndUpdateDatasetSizeAndFileCount({ _id: "missing" }),
      ).rejects.toThrow(NotFoundException);
      expect(datasetsService.updateDatasetSizeAndFiles).not.toHaveBeenCalled();
    });
  });
});
