import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { SamplesController } from "./samples.controller";
import { SamplesService } from "./samples.service";
import { NotFoundException, HttpException } from "@nestjs/common";
import { Request } from "express";
import { SampleClass } from "./schemas/sample.schema";
import { PartialUpdateSampleDto } from "./dto/update-sample.dto";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}

class CaslAbilityFactoryMock {}

class SamplesServiceMock {
  findOne = jest.fn();
  update = jest.fn();
}

describe("SamplesController", () => {
  let controller: SamplesController;
  let samplesService: SamplesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SamplesController],
      providers: [
        { provide: AttachmentsService, useClass: AttachmentsServiceMock },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: SamplesService, useClass: SamplesServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<SamplesController>(SamplesController);
    samplesService = module.get<SamplesService>(SamplesService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("update", () => {
    const sampleId = "sample123";
    const updateDto: PartialUpdateSampleDto = { name: "Updated Sample" };
    const mockRequest = {} as Request;

    it("should update sample when header is missing", async () => {
      const sample = {
        _id: sampleId,
        updatedAt: new Date("2023-01-01"),
      } as SampleClass;
      samplesService.findOne.mockResolvedValue(sample);
      samplesService.update.mockResolvedValue({ ...sample, ...updateDto });

      jest
        .spyOn(controller, "checkPermissionsForSample")
        .mockResolvedValue(sample);

      const result = await controller.update(
        mockRequest,
        sampleId,
        updateDto,
        {},
      );
      expect(result).toEqual({ ...sample, ...updateDto });
    });

    it("should throw NotFoundException if sample not found", async () => {
      samplesService.findOne.mockResolvedValue(null);

      await expect(
        controller.update(mockRequest, sampleId, updateDto, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw PreconditionFailed if header date is older than updatedAt", async () => {
      const sample = {
        _id: sampleId,
        updatedAt: new Date("2023-01-01"),
      } as SampleClass;
      samplesService.findOne.mockResolvedValue(sample);

      jest
        .spyOn(controller, "checkPermissionsForSample")
        .mockResolvedValue(sample);

      const headers = {
        "if-unmodified-since": new Date("2022-01-01").toUTCString(),
      };

      await expect(
        controller.update(mockRequest, sampleId, updateDto, headers),
      ).rejects.toThrow(HttpException);
    });
    it("should update sample if header date is invalid", async () => {
      const sample = { _id: sampleId, updatedAt: new Date() } as SampleClass;
      samplesService.findOne.mockResolvedValue(sample);
      samplesService.update.mockResolvedValue({ ...sample, ...updateDto });

      jest
        .spyOn(controller, "checkPermissionsForSample")
        .mockResolvedValue(sample);

      const headers = {
        "if-unmodified-since": "invalid-date-string",
      };

      const result = await controller.update(
        mockRequest,
        sampleId,
        updateDto,
        headers,
      );
      expect(result).toEqual({ ...sample, ...updateDto });
    });

    it("should update sample if header date is not present", async () => {
      const sample = { _id: sampleId, updatedAt: new Date() } as SampleClass;
      samplesService.findOne.mockResolvedValue(sample);
      samplesService.update.mockResolvedValue({ ...sample, ...updateDto });

      jest
        .spyOn(controller, "checkPermissionsForSample")
        .mockResolvedValue(sample);

      const result = await controller.update(
        mockRequest,
        sampleId,
        updateDto,
        {},
      );
      expect(result).toEqual({ ...sample, ...updateDto });
    });
  });
});
