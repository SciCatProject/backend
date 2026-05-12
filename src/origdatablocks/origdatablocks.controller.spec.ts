import { Test, TestingModule } from "@nestjs/testing";
import { OrigDatablocksController } from "./origdatablocks.controller";
import { OrigDatablocksService } from "src/origdatablocks/origdatablocks.service";
import { DatasetsService } from "src/datasets/datasets.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { ConfigModule } from "@nestjs/config";
import { NotFoundException, HttpException } from "@nestjs/common";
import { Request } from "express";

class OrigDatablocksServiceMock {
  findOne = jest.fn();
  findByIdAndUpdate = jest.fn();
  aggregateSizeAndFileCount = jest.fn();
}

class DatasetsServiceMock {
  findByIdAndUpdate = jest.fn();
}

class CaslAbilityFactoryMock {}

describe("OrigDatablocksController", () => {
  let controller: OrigDatablocksController;
  let origDatablocksService: OrigDatablocksServiceMock;
  let datasetsService: DatasetsServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrigDatablocksController],
      imports: [ConfigModule],
      providers: [
        { provide: OrigDatablocksService, useClass: OrigDatablocksServiceMock },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<OrigDatablocksController>(OrigDatablocksController);
    origDatablocksService = module.get<OrigDatablocksService>(
      OrigDatablocksService,
    ) as unknown as OrigDatablocksServiceMock;
    datasetsService = module.get<DatasetsService>(
      DatasetsService,
    ) as unknown as DatasetsServiceMock;
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("update", () => {
    const mockRequest = {
      headers: { "if-unmodified-since": new Date().toUTCString() },
    } as Request;
    const mockDto = { name: "Updated Name" };
    const mockDatablock = {
      _id: "123",
      updatedAt: new Date(Date.now() - 1000),
      datasetId: "ds1",
    };

    beforeEach(() => {
      // Isolate the update handler from the side-effect helper
      controller["updateDatasetSizeAndFiles"] = jest.fn();
    });

    it("should throw NotFoundException if datablock not found before update", async () => {
      origDatablocksService.findOne.mockResolvedValue(null);

      await expect(
        controller.update(mockRequest, "123", mockDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw PreconditionFailed if header date <= updatedAt", async () => {
      origDatablocksService.findOne.mockResolvedValue({
        ...mockDatablock,
        updatedAt: new Date(),
      });

      jest
        .spyOn(controller, "checkPermissionsForOrigDatablock")
        .mockResolvedValue(mockDatablock);

      await expect(
        controller.update(mockRequest, "123", mockDto),
      ).rejects.toThrow(HttpException);
    });

    it("should throw NotFoundException if datablock not found after update", async () => {
      origDatablocksService.findOne.mockResolvedValue(mockDatablock);
      origDatablocksService.findByIdAndUpdate.mockResolvedValue(null);

      jest
        .spyOn(controller, "checkPermissionsForOrigDatablock")
        .mockResolvedValue(mockDatablock);

      await expect(
        controller.update(mockRequest, "123", mockDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return updated datablock on success", async () => {
      const updatedDatablock = { ...mockDatablock, name: "Updated Name" };

      origDatablocksService.findOne.mockResolvedValue(mockDatablock);
      origDatablocksService.findByIdAndUpdate.mockResolvedValue(
        updatedDatablock,
      );

      jest
        .spyOn(controller, "checkPermissionsForOrigDatablock")
        .mockResolvedValue(updatedDatablock);

      const result = await controller.update(mockRequest, "123", mockDto);

      expect(result).toEqual(updatedDatablock);
      expect(controller["updateDatasetSizeAndFiles"]).toHaveBeenCalledWith(
        "ds1",
      );
    });

    describe("update", () => {
      const mockDto = { name: "Updated Name" };
      const mockDatablock = {
        _id: "123",
        updatedAt: new Date(),
        datasetId: "ds1",
      };
      const updatedDatablock = { ...mockDatablock, name: "Updated Name" };

      beforeEach(() => {
        origDatablocksService.findOne.mockResolvedValue(mockDatablock);
        origDatablocksService.findByIdAndUpdate.mockResolvedValue(
          updatedDatablock,
        );
      });

      it("should proceed with update if 'if-unmodified-since' header is missing", async () => {
        const mockRequest = { headers: {} } as Request; // No header

        jest
          .spyOn(controller, "checkPermissionsForOrigDatablock")
          .mockResolvedValue(mockDatablock);

        const result = await controller.update(mockRequest, "123", mockDto);

        expect(result).toEqual(updatedDatablock);
        expect(controller["updateDatasetSizeAndFiles"]).toHaveBeenCalledWith(
          "ds1",
        );
      });

      it("should proceed with update if 'if-unmodified-since' header is malformed", async () => {
        const mockRequest = {
          headers: { "if-unmodified-since": "not-a-date" },
        } as Request; // Invalid date format

        jest
          .spyOn(controller, "checkPermissionsForOrigDatablock")
          .mockResolvedValue(mockDatablock);

        const result = await controller.update(mockRequest, "123", mockDto);

        expect(result).toEqual(updatedDatablock);
        expect(controller["updateDatasetSizeAndFiles"]).toHaveBeenCalledWith(
          "ds1",
        );
      });
    });
  });

  describe("updateDatasetSizeAndFiles", () => {
    it("should use aggregateSizeAndFileCount and update the dataset", async () => {
      origDatablocksService.aggregateSizeAndFileCount.mockResolvedValue({
        size: 2000,
        numberOfFiles: 5,
      });

      await controller["updateDatasetSizeAndFiles"]("testPid");

      expect(
        origDatablocksService.aggregateSizeAndFileCount,
      ).toHaveBeenCalledWith("testPid");
      expect(datasetsService.findByIdAndUpdate).toHaveBeenCalledWith(
        "testPid",
        {
          size: 2000,
          numberOfFiles: 5,
        },
      );
    });

    it("should propagate zero totals when no origdatablocks exist", async () => {
      origDatablocksService.aggregateSizeAndFileCount.mockResolvedValue({
        size: 0,
        numberOfFiles: 0,
      });

      await controller["updateDatasetSizeAndFiles"]("emptyPid");

      expect(datasetsService.findByIdAndUpdate).toHaveBeenCalledWith(
        "emptyPid",
        { size: 0, numberOfFiles: 0 },
      );
    });
  });
});
