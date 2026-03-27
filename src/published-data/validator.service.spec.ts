import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "src/attachments/attachments.service";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsService } from "src/proposals/proposals.service";
import { ReadOnlyDatasetsService, ValidatorService } from "./validator.service";
import { ErrorObject } from "ajv";

describe("ValidatorService", () => {
  let service: ValidatorService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockDataService = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
  };

  const createService = async (publishedDataConfig: unknown) => {
    mockConfigService.get.mockImplementation((key: string) => {
      if (key === "publishedDataConfig") return publishedDataConfig;
      return null;
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ValidatorService,
        { provide: ConfigService, useValue: mockConfigService },
        { provide: ProposalsService, useValue: mockDataService },
        { provide: DatasetsService, useValue: mockDataService },
        { provide: AttachmentsService, useValue: mockDataService },
      ],
    }).compile();

    return module.get<ValidatorService>(ValidatorService);
  };

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", async () => {
    service = await createService({ metadataSchema: {} });
    expect(service).toBeDefined();
  });

  describe("validate", () => {
    it("should be a no-op if metadataSchema is missing", async () => {
      service = await createService({});
      const errors = await service.validate({});
      expect(errors).toBeNull();
    });

    it("should return null when metadata is valid", async () => {
      const schema = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };

      service = await createService({ metadataSchema: schema });

      const mockData = { metadata: { name: "abc" } };
      const errors = await service.validate(mockData);
      expect(errors).toBeNull();
    });

    it("should return errors when metadata is invalid", async () => {
      const schema = {
        type: "object",
        properties: { name: { type: "string" } },
        required: ["name"],
      };

      service = await createService({ metadataSchema: schema });

      const mockData = { metadata: { invalidKey: 5 } };
      const errors = await service.validate(mockData);

      expect(errors).toBeDefined();
      expect(Array.isArray(errors)).toBe(true);
      const errorList = errors! as ErrorObject<
        string,
        Record<string, unknown>,
        unknown
      >[];
      expect(errorList.length).toBe(1);
      expect(errorList[0].message).toBe("must have required property 'name'");
    });
  });

  describe("Dynamic Defaults", () => {
    it("should handle pre-defined dynamic default (currentYear)", async () => {
      const schema = {
        type: "object",
        required: ["publicationYear"],
        allOf: [
          { dynamicDefaults: { publicationYear: "currentYear" } },
          { properties: { publicationYear: { type: "number" } } },
        ],
      };

      service = await createService({ metadataSchema: schema });

      const mockData = { metadata: {} };
      const errors = await service.validate(mockData);
      expect(errors).toBeNull();

      const metadata = mockData.metadata as Record<string, unknown>;
      expect(metadata.publicationYear).toBe(new Date().getFullYear());
    });

    it("should handle user-defined dynamic default (sync)", async () => {
      const schema = {
        type: "object",
        required: ["publicationYear"],
        allOf: [
          { dynamicDefaults: { publicationYear: "userDefinedFunction" } },
          { properties: { publicationYear: { type: "number" } } },
        ],
      };

      service = await createService({ metadataSchema: schema });

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).dynamicDefaults.set(
        "userDefinedFunction",
        () => () => 5,
      );

      const mockData = { metadata: {} };
      const errors = await service.validate(mockData);
      expect(errors).toBeNull();

      const metadata = mockData.metadata as Record<string, unknown>;
      expect(metadata.publicationYear).toBe(5);
    });

    it("should handle user-defined dynamic default (async)", async () => {
      const schema = {
        type: "object",
        required: ["publicationYear"],
        allOf: [
          { dynamicDefaults: { publicationYear: "userDefinedAsyncFunction" } },
          { properties: { publicationYear: { type: "number" } } },
        ],
      };

      service = await createService({ metadataSchema: schema });

      mockDataService.count.mockImplementation(() => 6);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (service as any).dynamicDefaults.set(
        "userDefinedAsyncFunction",
        async function (ctx: { datasetsService: ReadOnlyDatasetsService }) {
          const datasetsCount = await ctx.datasetsService.count({});
          return () => datasetsCount;
        },
      );

      const mockData = { metadata: {} };
      const errors = await service.validate(mockData);
      expect(errors).toBeNull();

      const metadata = mockData.metadata as Record<string, unknown>;
      expect(metadata.publicationYear).toBe(6);
    });

    it("should error on unknown dynamicDefaults functions", async () => {
      const schema = {
        type: "object",
        required: ["publicationYear"],
        allOf: [
          { dynamicDefaults: { publicationYear: "notImplemented" } },
          { properties: { publicationYear: { type: "number" } } },
        ],
      };

      service = await createService({ metadataSchema: schema });

      const mockData = { metadata: {} };
      await expect(service.validate(mockData)).rejects.toThrow(
        'invalid "dynamicDefaults" keyword property value: notImplemented',
      );
    });
  });
});
