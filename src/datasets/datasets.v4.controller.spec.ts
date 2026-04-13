import { Test, TestingModule } from "@nestjs/testing";
import { DatasetsService } from "./datasets.service";
import { LogbooksService } from "src/logbooks/logbooks.service";
import { ConfigModule } from "@nestjs/config";
import { DatasetsV4Controller } from "./datasets.v4.controller";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { HttpModule } from "@nestjs/axios";
import { PartialUpdateDatasetDto } from "./dto/update-dataset.dto";
import { Request } from "express";

class DatasetsServiceMock {}

class CaslAbilityFactoryMock {}

class LogbooksServiceMock {}

describe("DatasetsController", () => {
  let controller: DatasetsV4Controller;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DatasetsV4Controller],
      imports: [ConfigModule, HttpModule],
      providers: [
        { provide: LogbooksService, useClass: LogbooksServiceMock },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<DatasetsV4Controller>(DatasetsV4Controller);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});

describe("DatasetsController (manual instantiate)", () => {
  let controller: DatasetsV4Controller;

  // ---- Mocks ----

  const mockUser = { id: "u-1", roles: ["admin"] };

  const datasetsService = {
    findOne: jest.fn().mockResolvedValue({
      pid: "test-dataset-id",
      updatedAt: new Date("2025-01-01T00:00:00Z"),
      scientificMetadata: {
        temperature: { value: 295, unit: "K" },
      },
    }),
    findByIdAndUpdate: jest
      .fn()
      .mockImplementation((pid: string, updateDto) => ({
        pid,
        ...updateDto,
      })),
  } as unknown as jest.Mocked<DatasetsService>;

  // CASL factory mock (kept for completeness; permission check is stubbed anyway)
  const caslAbilityFactory = {
    createForUser: jest.fn().mockReturnValue({
      can: () => true,
      cannot: () => false,
    }),
    datasetInstanceAccess: jest.fn().mockReturnValue(true),
  } as unknown as jest.Mocked<CaslAbilityFactory>;

  class LogbooksServiceMock {}

  let checkSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();

    controller = new DatasetsV4Controller(
      datasetsService,
      new LogbooksServiceMock(),
      caslAbilityFactory,
    );

    // Force the permission check to always pass in these unit tests
    checkSpy = jest
      .spyOn(controller, "checkPermissionsForDatasetExtended")
      .mockResolvedValue(undefined);
  });

  it("should update dataset and return updated result (happy path with fresh header)", async () => {
    const pid = "test-dataset-id";
    const updateDto: PartialUpdateDatasetDto = {
      scientificMetadata: { temperature: { value: 300, unit: "K" } },
    };

    const req = {
      headers: {
        "content-type": "application/json",
        "if-unmodified-since": "2026-01-01T00:00:00Z", // Header is *after* updatedAt -> allowed
      },
      user: mockUser,
    } as unknown as Request;

    const result = await controller.findByIdAndUpdate(req, pid, updateDto);

    expect(result).toBeDefined();
    expect(result.pid).toBe(pid);
    expect(result.scientificMetadata.temperature.value).toBe(300);

    expect(datasetsService.findOne).toHaveBeenCalledWith({ where: { pid } });
    expect(datasetsService.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  it.each([
    { title: "missing header", header: {} as Record<string, string> },
    {
      title: "invalid header",
      header: { "if-unmodified-since": "not-a-date" } as Record<string, string>,
    },
  ])("should update when if-unmodified-since is $title", async ({}) => {
    const pid = "test-dataset-id";
    const updateDto: PartialUpdateDatasetDto = {
      scientificMetadata: { temperature: { value: 305, unit: "K" } },
    };

    const req = {
      headers: {
        "content-type": "application/json",
        "if-unmodified-since": "not-a-date",
      },
      user: mockUser,
    } as unknown as Request;

    const result = await controller.findByIdAndUpdate(req, pid, updateDto);

    expect(result).toBeDefined();
    expect(result.pid).toBe(pid);
    expect(result.scientificMetadata.temperature.value).toBe(305);

    expect(datasetsService.findOne).toHaveBeenCalledWith({ where: { pid } });
    expect(datasetsService.findByIdAndUpdate).toHaveBeenCalledTimes(1);
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });

  it("should NOT update and throw 412 when if-unmodified-since is older than updatedAt", async () => {
    const pid = "test-dataset-id";
    const updateDto: PartialUpdateDatasetDto = {
      scientificMetadata: { temperature: { value: 310, unit: "K" } },
    };

    const req = {
      headers: {
        "content-type": "application/json",
        "if-unmodified-since": "2024-12-31T12:00:00Z", // Header is *before* updatedAt -> should fail with PRECONDITION_FAILED (412)
      },
      user: mockUser,
    } as unknown as Request;

    const promise = controller.findByIdAndUpdate(req, pid, updateDto);

    await expect(promise).rejects.toThrow(
      "Resource has been modified on server",
    );

    expect(datasetsService.findOne).toHaveBeenCalledWith({ where: { pid } });
    expect(datasetsService.findByIdAndUpdate).not.toHaveBeenCalled();
    expect(checkSpy).toHaveBeenCalledTimes(1);
  });
});
