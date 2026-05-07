import { Test, TestingModule } from "@nestjs/testing";
import { OrigDatablocksV4Controller } from "./origdatablocks.v4.controller";
import { OrigDatablocksService } from "src/origdatablocks/origdatablocks.service";
import { DatasetsService } from "src/datasets/datasets.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { ConfigModule } from "@nestjs/config";
import { NotFoundException, PreconditionFailedException } from "@nestjs/common";
import { Request } from "express";

class OrigDatablocksServiceMock {
  findOne = jest.fn();
  findByIdAndUpdate = jest.fn();
  findOneComplete = jest.fn();
}

class DatasetsServiceMock {
  findOneComplete = jest.fn();
}

class CaslAbilityFactoryMock {}

describe("OrigDatablocksV4Controller", () => {
  let controller: OrigDatablocksV4Controller;
  let origDatablocksService: OrigDatablocksServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrigDatablocksV4Controller],
      imports: [ConfigModule],
      providers: [
        { provide: OrigDatablocksService, useClass: OrigDatablocksServiceMock },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<OrigDatablocksV4Controller>(
      OrigDatablocksV4Controller,
    );
    origDatablocksService = module.get(OrigDatablocksService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findByIdAndUpdate", () => {
    const mockUpdateDto = {
      name: "Updated Name",
    };

    const mockDatablock = {
      _id: "db123",
      updatedAt: new Date(Date.now() - 1000),
      datasetId: "ds123",
    };

    const updatedDatablock = {
      ...mockDatablock,
      name: "Updated Name",
    };

    beforeEach(() => {
      jest
        .spyOn(controller, "updateDatasetSizeAndFiles")
        .mockResolvedValue(undefined);
    });

    it("should throw NotFoundException if datablock not found", async () => {
      jest.spyOn(origDatablocksService, "findOne").mockResolvedValue(null);

      const mockRequest = {
        user: { id: "user123" },
        headers: {
          "if-unmodified-since": new Date().toISOString(),
        },
      } as unknown as Request;

      await expect(
        controller.findByIdAndUpdate(mockRequest, "db123", mockUpdateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw HttpException if service throws exception (when header date is older than updatedAt)", async () => {
      jest.spyOn(origDatablocksService, "findOne").mockResolvedValue({
        ...mockDatablock,
        updatedAt: new Date(),
      });
      origDatablocksService.findByIdAndUpdate.mockRejectedValue(
        new PreconditionFailedException("Resource has been modified on server"),
      );

      const mockRequest = {
        user: { id: "user123" },
        headers: {
          "if-unmodified-since": new Date(Date.now() - 10000).toISOString(),
        },
      } as unknown as Request;

      jest
        .spyOn(controller, "checkPermissionsForOrigDatablockWrite")
        .mockResolvedValue(updatedDatablock);

      await expect(
        controller.findByIdAndUpdate(mockRequest, "db123", mockUpdateDto),
      ).rejects.toThrow(PreconditionFailedException);
      expect(origDatablocksService.findByIdAndUpdate).toHaveBeenCalledWith(
        "db123",
        mockUpdateDto,
        new Date(mockRequest.headers["if-unmodified-since"] as string),
      );
    });

    it("should throw NotFoundException if update returns null", async () => {
      jest
        .spyOn(origDatablocksService, "findOne")
        .mockResolvedValue(mockDatablock);
      jest
        .spyOn(origDatablocksService, "findByIdAndUpdate")
        .mockResolvedValue(null);

      const mockRequest = {
        user: { id: "user123" },
        headers: {
          "if-unmodified-since": new Date(Date.now() - 10000).toISOString(),
        },
      } as unknown as Request;

      await expect(
        controller.findByIdAndUpdate(mockRequest, "db123", {}, mockUpdateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should return updated datablock on success", async () => {
      jest
        .spyOn(origDatablocksService, "findOne")
        .mockResolvedValue(mockDatablock);
      jest
        .spyOn(origDatablocksService, "findByIdAndUpdate")
        .mockResolvedValue(updatedDatablock);

      jest
        .spyOn(controller, "checkPermissionsForOrigDatablockWrite")
        .mockResolvedValue(updatedDatablock);

      const mockRequest = {
        user: { id: "user123" },
        headers: {},
      } as unknown as Request;

      const result = await controller.findByIdAndUpdate(
        mockRequest,
        "db123",
        mockUpdateDto,
      );
      expect(result).toEqual(updatedDatablock);
    });

    it("should succeed if 'if-unmodified-since' header is missing", async () => {
      jest
        .spyOn(origDatablocksService, "findOne")
        .mockResolvedValue(mockDatablock);
      jest
        .spyOn(origDatablocksService, "findByIdAndUpdate")
        .mockResolvedValue(updatedDatablock);

      jest
        .spyOn(controller, "checkPermissionsForOrigDatablockWrite")
        .mockResolvedValue(updatedDatablock);

      const mockRequest = {
        user: { id: "user123" },
        headers: {},
      } as unknown as Request;

      const result = await controller.findByIdAndUpdate(
        mockRequest,
        "db123",
        mockUpdateDto,
      );
      expect(result).toEqual(updatedDatablock);
    });

    it("should succeed if 'if-unmodified-since' header is malformed", async () => {
      jest
        .spyOn(origDatablocksService, "findOne")
        .mockResolvedValue(mockDatablock);
      jest
        .spyOn(origDatablocksService, "findByIdAndUpdate")
        .mockResolvedValue(updatedDatablock);

      jest
        .spyOn(controller, "checkPermissionsForOrigDatablockWrite")
        .mockResolvedValue(updatedDatablock);

      const mockRequest = {
        user: { id: "user123" },
        headers: { "if-unmodified-since": "not-a-date" },
      } as unknown as Request;

      const result = await controller.findByIdAndUpdate(
        mockRequest,
        "db123",
        mockUpdateDto,
      );
      expect(result).toEqual(updatedDatablock);
    });
  });
});
