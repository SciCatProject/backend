import { ConfigModule } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { InstrumentsController } from "./instruments.controller";
import { InstrumentsService } from "./instruments.service";
import {
  NotFoundException,
  ConflictException,
  PreconditionFailedException,
} from "@nestjs/common";
import { MongoError } from "mongodb";

class InstrumentsServiceMock {
  findOne = jest.fn();
  findOneAndUpdate = jest.fn();
}

class CaslAbilityFactoryMock {}

describe("InstrumentsController", () => {
  let controller: InstrumentsController;
  let service: InstrumentsServiceMock;

  const mockInstrument = {
    _id: "123",
    updatedAt: new Date("2025-09-01T10:00:00Z"),
  };

  const mockUpdateDto = { name: "Updated Instrument" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [ConfigModule],
      controllers: [InstrumentsController],
      providers: [
        { provide: InstrumentsService, useClass: InstrumentsServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<InstrumentsController>(InstrumentsController);
    service = module.get<InstrumentsService>(InstrumentsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  it("should throw NotFoundException if instrument not found", async () => {
    service.findOneAndUpdate.mockImplementation(() => {
      throw new NotFoundException("Instrument not found");
    });

    await expect(controller.update("123", mockUpdateDto, {})).rejects.toThrow(
      NotFoundException,
    );
  });

  it("should update if header is missing", async () => {
    service.findOne.mockResolvedValue(mockInstrument);
    service.findOneAndUpdate.mockResolvedValue({
      ...mockInstrument,
      ...mockUpdateDto,
    });

    const result = await controller.update("123", mockUpdateDto, {});
    expect(result).toEqual({ ...mockInstrument, ...mockUpdateDto });
    expect(service.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "123" }),
      mockUpdateDto,
      undefined,
    );
  });

  it("should throw PRECONDITION_FAILED if instruments service throws it", async () => {
    service.findOneAndUpdate.mockImplementation(() => {
      throw new PreconditionFailedException("Resource has been modified");
    });

    const headers = {
      "if-unmodified-since": "2025-09-01T09:00:00Z",
    };

    await expect(
      controller.update("123", mockUpdateDto, headers),
    ).rejects.toThrow(PreconditionFailedException);
    expect(service.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "123" }),
      mockUpdateDto,
      new Date("2025-09-01T09:00:00Z"),
    );
  });

  it("should update if valid header is provided", async () => {
    service.findOne.mockResolvedValue(mockInstrument);
    service.findOneAndUpdate.mockResolvedValue({
      ...mockInstrument,
      ...mockUpdateDto,
    });

    const headers = {
      "if-unmodified-since": "2025-09-02T10:00:00Z",
    };

    const result = await controller.update("123", mockUpdateDto, headers);
    expect(result).toEqual({ ...mockInstrument, ...mockUpdateDto });
    expect(service.findOneAndUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ _id: "123" }),
      mockUpdateDto,
      new Date("2025-09-02T10:00:00Z"),
    );
  });

  it("should throw ConflictException on duplicate key error", async () => {
    service.findOne.mockResolvedValue(mockInstrument);
    service.findOneAndUpdate.mockRejectedValue({ code: 11000 } as MongoError);

    await expect(controller.update("123", mockUpdateDto, {})).rejects.toThrow(
      ConflictException,
    );
  });
});
