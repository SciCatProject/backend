import { Test, TestingModule } from "@nestjs/testing";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { OpensearchController } from "./opensearch.controller";
import { OpensearchService } from "./opensearch.service";
import { CreateIndexDto } from "./dto/create-index.dto";
import { UpdateIndexDto } from "./dto/update-index.dto";

class CaslAbilityFactoryMock {}

describe("OpensearchController", () => {
  let controller: OpensearchController;

  const mockOpensearchService = {
    createIndex: jest.fn(),
    deleteIndex: jest.fn(),
    getIndexConfig: jest.fn(),
    updateIndexSettings: jest.fn(),
  };

  const mockDatasetsService = {
    syncDatasetsToOpensearch: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OpensearchController],
      providers: [
        { provide: OpensearchService, useValue: mockOpensearchService },
        { provide: DatasetsService, useValue: mockDatasetsService },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<OpensearchController>(OpensearchController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createIndex", () => {
    it("should delegate to opensearchService.createIndex with the provided dto", async () => {
      const createIndexDto = {
        index: "dataset",
        settings: { index: { number_of_replicas: 1 } },
        mappings: { properties: { datasetName: { type: "text" } } },
      } as unknown as CreateIndexDto;
      const expected = { acknowledged: true, index: "dataset" };
      mockOpensearchService.createIndex.mockResolvedValue(expected);

      const result = await controller.createIndex(createIndexDto);

      expect(mockOpensearchService.createIndex).toHaveBeenCalledTimes(1);
      expect(mockOpensearchService.createIndex).toHaveBeenCalledWith(
        createIndexDto,
      );
      expect(result).toEqual(expected);
    });
  });

  describe("syncDatabase", () => {
    it("should delegate to datasetsService.syncDatasetsToOpensearch with the index name", async () => {
      const expected = { synced: 10 };
      mockDatasetsService.syncDatasetsToOpensearch.mockResolvedValue(expected);

      const result = await controller.syncDatabase("dataset");

      expect(mockDatasetsService.syncDatasetsToOpensearch).toHaveBeenCalledWith(
        "dataset",
      );
      expect(result).toEqual(expected);
    });

    it("should trim whitespace from the index name", async () => {
      await controller.syncDatabase("  dataset  ");

      expect(mockDatasetsService.syncDatasetsToOpensearch).toHaveBeenCalledWith(
        "dataset",
      );
    });
  });

  describe("deleteIndex", () => {
    it("should delegate to opensearchService.deleteIndex with the trimmed index name", async () => {
      const expected = { acknowledged: true };
      mockOpensearchService.deleteIndex.mockResolvedValue(expected);

      const result = await controller.deleteIndex(" dataset ");

      expect(mockOpensearchService.deleteIndex).toHaveBeenCalledWith("dataset");
      expect(result).toEqual(expected);
    });
  });

  describe("getIndex", () => {
    it("should delegate to opensearchService.getIndexConfig with the trimmed index name", async () => {
      const expected = {
        settings: { index: { number_of_replicas: "1" } },
        mappings: { properties: {} },
      };
      mockOpensearchService.getIndexConfig.mockResolvedValue(expected);

      const result = await controller.getIndex(" dataset ");

      expect(mockOpensearchService.getIndexConfig).toHaveBeenCalledWith(
        "dataset",
      );
      expect(result).toEqual(expected);
    });
  });

  describe("updateIndex", () => {
    it("should delegate to opensearchService.updateIndexSettings with the provided dto", async () => {
      const updateIndexDto = {
        index: "dataset",
        settings: { index: { refresh_interval: "1s" } },
      } as unknown as UpdateIndexDto;
      const expected = { acknowledged: true };
      mockOpensearchService.updateIndexSettings.mockResolvedValue(expected);

      const result = await controller.updateIndex(updateIndexDto);

      expect(mockOpensearchService.updateIndexSettings).toHaveBeenCalledWith(
        updateIndexDto,
      );
      expect(result).toEqual(expected);
    });
  });
});
