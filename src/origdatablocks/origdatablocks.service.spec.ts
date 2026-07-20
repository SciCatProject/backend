import { REQUEST } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { DatasetsService } from "src/datasets/datasets.service";
import { OrigDatablocksService } from "./origdatablocks.service";
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

class DatasetsServiceMock {
  updateDatasetSizeAndFiles = jest.fn().mockResolvedValue(undefined);
}

describe("OrigdatablocksService", () => {
  let service: OrigDatablocksService;

  let model: Model<OrigDatablock>;
  let datasetsService: DatasetsServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrigDatablocksService,
        {
          provide: getModelToken("OrigDatablock"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockOrigDatablock),
            constructors: jest.fn().mockResolvedValue(mockOrigDatablock),
            find: jest.fn(),
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: REQUEST, useValue: { user: { username: "testUser" } } },
      ],
    }).compile();

    service = await module.resolve<OrigDatablocksService>(
      OrigDatablocksService,
    );
    model = module.get<Model<OrigDatablock>>(getModelToken("OrigDatablock"));
    datasetsService = module.get<DatasetsServiceMock>(DatasetsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("updateDatasetSizeAndFiles", () => {
    it("should delegate size and file count aggregation to the datasets service, keyed on the origdatablock model and its size/numberOfFiles fields", async () => {
      await service.updateDatasetSizeAndFiles("testPid");

      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        "testPid",
        model,
        "size",
        "numberOfFiles",
      );
    });

    it("should forward the given datasetId unchanged", async () => {
      await service.updateDatasetSizeAndFiles("ds123");

      expect(datasetsService.updateDatasetSizeAndFiles).toHaveBeenCalledWith(
        "ds123",
        expect.anything(),
        "size",
        "numberOfFiles",
      );
    });

    it("should propagate errors raised by the datasets service", async () => {
      datasetsService.updateDatasetSizeAndFiles.mockRejectedValueOnce(
        new Error("aggregation failed"),
      );

      await expect(
        service.updateDatasetSizeAndFiles("testPid"),
      ).rejects.toThrow("aggregation failed");
    });
  });
});
