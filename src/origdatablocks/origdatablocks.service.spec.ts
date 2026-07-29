import { ForbiddenException, NotFoundException } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { DatasetsService } from "src/datasets/datasets.service";
import { OrigDatablocksService } from "./origdatablocks.service";
import { CreateOrigDatablockDto } from "./dto/create-origdatablock.dto";
import { OrigDatablock } from "./schemas/origdatablock.schema";

const mockOrigDatablock: OrigDatablock = {
  _id: "testId",
  datasetId: "testPid",
  size: 1000,
  ownerGroup: "testOwner",
  accessGroups: ["testAccess"],
  instrumentGroup: "testInstrument",
  createdBy: "testUser",
  updatedBy: "testUser",
  chkAlg: "sha1",
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
    },
  ],
};

const mockCreateOrigDatablockDto: CreateOrigDatablockDto = {
  datasetId: mockOrigDatablock.datasetId,
  size: mockOrigDatablock.size,
  ownerGroup: mockOrigDatablock.ownerGroup,
  accessGroups: mockOrigDatablock.accessGroups,
  instrumentGroup: mockOrigDatablock.instrumentGroup,
  chkAlg: mockOrigDatablock.chkAlg,
  dataFileList: mockOrigDatablock.dataFileList,
};

class DatasetsServiceMock {
  updateDatasetSizeAndFiles = jest.fn().mockResolvedValue(undefined);
}

function MockOrigDatablockModel(
  this: Record<string, unknown>,
  data: Record<string, unknown>,
) {
  Object.assign(this, data);
  this.save = jest.fn().mockResolvedValue({ ...mockOrigDatablock, ...data });
}
MockOrigDatablockModel.find = jest.fn();
MockOrigDatablockModel.findOne = jest.fn();
MockOrigDatablockModel.findOneAndUpdate = jest.fn();
MockOrigDatablockModel.findOneAndDelete = jest.fn();
MockOrigDatablockModel.deleteMany = jest.fn();
MockOrigDatablockModel.countDocuments = jest.fn();
MockOrigDatablockModel.aggregate = jest.fn();
MockOrigDatablockModel.schema = {
  path: jest.fn().mockReturnValue({ instance: "String" }),
};

describe("OrigdatablocksService", () => {
  let service: OrigDatablocksService;
  let datasetsService: DatasetsServiceMock;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrigDatablocksService,
        {
          provide: getModelToken("OrigDatablock"),
          useValue: MockOrigDatablockModel,
        },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: REQUEST, useValue: { user: { username: "testUser" } } },
      ],
    }).compile();

    service = await module.resolve<OrigDatablocksService>(
      OrigDatablocksService,
    );
    datasetsService = module.get<DatasetsServiceMock>(DatasetsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("createAndUpdateDatasetSizeAndFileCount", () => {
    it("should create the origdatablock and then update the dataset size and file count", async () => {
      const result = await service.createAndUpdateDatasetSizeAndFileCount(
        mockCreateOrigDatablockDto,
      );

      expect(result).toEqual(
        expect.objectContaining({
          datasetId: mockCreateOrigDatablockDto.datasetId,
        }),
      );
      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        mockCreateOrigDatablockDto.datasetId,
        "size",
        "numberOfFiles",
        result,
        undefined,
      );
    });
  });

  describe("updateOneAndUpdateDatasetSizeAndFileCount", () => {
    const oldOrigDatablock: OrigDatablock = {
      ...mockOrigDatablock,
      size: 800,
      dataFileList: [],
    };

    it("should update the origdatablock and then update the dataset size and file count", async () => {
      (MockOrigDatablockModel.findOne as jest.Mock).mockResolvedValue(
        oldOrigDatablock,
      );
      (MockOrigDatablockModel.findOneAndUpdate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockOrigDatablock),
      });

      const result = await service.updateOneAndUpdateDatasetSizeAndFileCount(
        { _id: "testId" },
        { size: mockOrigDatablock.size },
      );

      expect(result).toEqual(mockOrigDatablock);
      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        mockOrigDatablock.datasetId,
        "size",
        "numberOfFiles",
        mockOrigDatablock,
        oldOrigDatablock,
      );
    });

    it("should throw ForbiddenException and not touch the dataset when the original origdatablock does not exist", async () => {
      (MockOrigDatablockModel.findOne as jest.Mock).mockResolvedValue(null);

      await expect(
        service.updateOneAndUpdateDatasetSizeAndFileCount(
          { _id: "missing" },
          { size: 2000 },
        ),
      ).rejects.toThrow(ForbiddenException);
      expect(MockOrigDatablockModel.findOneAndUpdate).not.toHaveBeenCalled();
      expect(datasetsService.updateDatasetSizeAndFiles).not.toHaveBeenCalled();
    });

    it("should throw NotFoundException and not touch the dataset when the origdatablock disappears during update", async () => {
      (MockOrigDatablockModel.findOne as jest.Mock).mockResolvedValue(
        oldOrigDatablock,
      );
      (MockOrigDatablockModel.findOneAndUpdate as jest.Mock).mockReturnValue({
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
    it("should remove the origdatablock and then update the dataset size and file count with negated values", async () => {
      (MockOrigDatablockModel.findOneAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockOrigDatablock),
      });

      const result = await service.removeAndUpdateDatasetSizeAndFileCount({
        _id: "testId",
      });

      expect(result).toEqual(mockOrigDatablock);
      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        mockOrigDatablock.datasetId,
        "size",
        "numberOfFiles",
        undefined,
        mockOrigDatablock,
      );
    });

    it("should throw NotFoundException and not touch the dataset when the origdatablock does not exist", async () => {
      (MockOrigDatablockModel.findOneAndDelete as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.removeAndUpdateDatasetSizeAndFileCount({ _id: "missing" }),
      ).rejects.toThrow(NotFoundException);
      expect(datasetsService.updateDatasetSizeAndFiles).not.toHaveBeenCalled();
    });
  });
});
