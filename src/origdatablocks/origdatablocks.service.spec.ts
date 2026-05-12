import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
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

describe("OrigdatablocksService", () => {
  let service: OrigDatablocksService;
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  let model: Model<OrigDatablock>;

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
            aggregate: jest.fn(),
          },
        },
      ],
    }).compile();

    service = await module.resolve<OrigDatablocksService>(
      OrigDatablocksService,
    );
    model = module.get<Model<OrigDatablock>>(getModelToken("OrigDatablock"));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("aggregateSizeAndFileCount", () => {
    it("should return summed size and file count from origdatablocks", async () => {
      (model.aggregate as jest.Mock).mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([{ _id: null, size: 5000, numberOfFiles: 3 }]),
      });

      const result = await service.aggregateSizeAndFileCount("testPid");

      expect(result).toEqual({ size: 5000, numberOfFiles: 3 });
    });

    it("should return zeros when no origdatablocks exist for the dataset", async () => {
      (model.aggregate as jest.Mock).mockReturnValue({
        exec: jest.fn().mockResolvedValue([]),
      });

      const result = await service.aggregateSizeAndFileCount("emptyPid");

      expect(result).toEqual({ size: 0, numberOfFiles: 0 });
    });

    it("should match on the given datasetId", async () => {
      (model.aggregate as jest.Mock).mockReturnValue({
        exec: jest
          .fn()
          .mockResolvedValue([{ _id: null, size: 0, numberOfFiles: 0 }]),
      });

      await service.aggregateSizeAndFileCount("ds123");

      expect(model.aggregate).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({ $match: { datasetId: "ds123" } }),
        ]),
      );
    });
  });
});
