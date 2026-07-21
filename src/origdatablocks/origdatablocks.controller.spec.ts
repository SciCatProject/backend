import { Test, TestingModule } from "@nestjs/testing";
import { OrigDatablocksController } from "./origdatablocks.controller";
import { OrigDatablocksService } from "src/origdatablocks/origdatablocks.service";
import { DatasetsService } from "src/datasets/datasets.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { ConfigModule } from "@nestjs/config";
import { NotFoundException, PreconditionFailedException } from "@nestjs/common";
import { Request } from "express";

class OrigDatablocksServiceMock {
  findOne = jest.fn();
  findByIdAndUpdateDatasetSizeAndFileCount = jest.fn();
}

class DatasetsServiceMock {}

class CaslAbilityFactoryMock {}

describe("OrigDatablocksController", () => {
  let controller: OrigDatablocksController;
  let origDatablocksService: OrigDatablocksServiceMock;

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

    it("should throw NotFoundException if datablock not found before update", async () => {
      origDatablocksService.findOne.mockResolvedValue(null);

      await expect(
        controller.update(mockRequest, "123", mockDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should propagate PreconditionFailedException if header date <= updatedAt", async () => {
      jest
        .spyOn(controller, "checkPermissionsForOrigDatablock")
        .mockResolvedValue(mockDatablock);
      origDatablocksService.findByIdAndUpdateDatasetSizeAndFileCount.mockRejectedValue(
        new PreconditionFailedException(
          "OrigDatablock #123 has been modified on server",
        ),
      );

      await expect(
        controller.update(mockRequest, "123", mockDto),
      ).rejects.toThrow(PreconditionFailedException);
    });

    it("should throw NotFoundException if datablock not found after update", async () => {
      jest
        .spyOn(controller, "checkPermissionsForOrigDatablock")
        .mockResolvedValue(mockDatablock);
      origDatablocksService.findByIdAndUpdateDatasetSizeAndFileCount.mockRejectedValue(
        new NotFoundException("OrigDatablock #123 not found"),
      );

      await expect(
        controller.update(mockRequest, "123", mockDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return updated datablock on success", async () => {
      const updatedDatablock = { ...mockDatablock, name: "Updated Name" };

      jest
        .spyOn(controller, "checkPermissionsForOrigDatablock")
        .mockResolvedValue(mockDatablock);
      origDatablocksService.findByIdAndUpdateDatasetSizeAndFileCount.mockResolvedValue(
        updatedDatablock,
      );

      const result = await controller.update(mockRequest, "123", mockDto);

      expect(result).toEqual(updatedDatablock);
      expect(
        origDatablocksService.findByIdAndUpdateDatasetSizeAndFileCount,
      ).toHaveBeenCalledWith(
        "123",
        mockDto,
        new Date(mockRequest.headers["if-unmodified-since"] as string),
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
        jest
          .spyOn(controller, "checkPermissionsForOrigDatablock")
          .mockResolvedValue(mockDatablock);
        origDatablocksService.findByIdAndUpdateDatasetSizeAndFileCount.mockResolvedValue(
          updatedDatablock,
        );
      });

      it("should proceed with update if 'if-unmodified-since' header is missing", async () => {
        const mockRequest = { headers: {} } as Request; // No header

        const result = await controller.update(mockRequest, "123", mockDto);

        expect(result).toEqual(updatedDatablock);
        expect(
          origDatablocksService.findByIdAndUpdateDatasetSizeAndFileCount,
        ).toHaveBeenCalledWith("123", mockDto, undefined);
      });

      it("should proceed with update if 'if-unmodified-since' header is malformed", async () => {
        const mockRequest = {
          headers: { "if-unmodified-since": "not-a-date" },
        } as Request; // Invalid date format

        const result = await controller.update(mockRequest, "123", mockDto);

        expect(result).toEqual(updatedDatablock);
        expect(
          origDatablocksService.findByIdAndUpdateDatasetSizeAndFileCount,
        ).toHaveBeenCalledWith("123", mockDto, undefined);
      });
    });
  });
});
