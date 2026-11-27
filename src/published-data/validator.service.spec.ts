import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "src/attachments/attachments.service";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsService } from "src/proposals/proposals.service";
import {
  ReadOnlyDatasetsService,
  ValidationContext,
  ValidatorService,
} from "./validator.service";
import { ErrorObject, KeywordDefinition, ValidationError } from "ajv";

describe("ValidatorService", () => {
  let service: ValidatorService;

  const mockConfigService = {
    get: jest.fn(),
  };

  const mockDataService = {
    findOne: jest.fn(),
    findAll: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
  };

  let customDefinitionsCount = 0;

  const createServiceWithModule = async (
    publishedDataConfig: unknown,
    customDefinitions?: object,
  ) => {
    const customDefinitionsPath = `ajv-custom-definitions-${customDefinitionsCount++}`;
    if (customDefinitions) {
      jest.doMock(customDefinitionsPath, () => customDefinitions, {
        virtual: true,
      });
    }

    mockConfigService.get.mockImplementation((key: string) => {
      if (key === "publishedDataConfig") return publishedDataConfig;
      if (key === "ajvCustomDefinitions" && customDefinitions)
        return customDefinitionsPath;
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

  const createService = (
    publishedDataConfig: unknown,
    customDefinitions?: {
      keywords?: KeywordDefinition[];
      dynamicDefaults?: Map<string, (...args: never[]) => unknown>;
    },
  ) => createServiceWithModule(publishedDataConfig, customDefinitions);

  afterEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("should be defined", async () => {
    service = await createService({ metadataSchema: {} });
    expect(service).toBeDefined();
  });

  describe("Custom definitions module", () => {
    const schema = {
      type: "object",
      properties: { name: { type: "string" } },
    };

    it.each([
      ["keywords", { keywords: [] }],
      ["dynamicDefaults", { dynamicDefaults: new Map() }],
    ])(
      "should not log an error for a module exporting only %s",
      async (_, customDefinitions) => {
        const errorSpy = jest.spyOn(Logger, "error").mockImplementation();

        service = await createService(
          { metadataSchema: schema },
          customDefinitions,
        );

        expect(
          await service.validate({ metadata: { name: "abc" } }),
        ).toBeNull();
        expect(errorSpy).not.toHaveBeenCalled();
      },
    );

    it.each([
      [
        "keywords that are not an array",
        { keywords: { keyword: "notInArray" } },
        /^Invalid keywords exported by '.*': expected an array, got 'object'\.$/,
      ],
      [
        "dynamicDefaults that are not a Map",
        { dynamicDefaults: { notInMap: () => () => 5 } },
        /^Invalid dynamicDefaults exported by '.*': expected a Map, got 'object'\.$/,
      ],
      [
        "dynamicDefaults entries that are not functions",
        { dynamicDefaults: new Map([["notAFunction", 5]]) },
        /^Invalid dynamicDefaults function 'notAFunction' exported by '.*': expected a function, got 'number'\.$/,
      ],
    ])("should fail to load %s", async (_, customDefinitions, message) => {
      const errorSpy = jest.spyOn(Logger, "error").mockImplementation();

      await expect(
        createServiceWithModule({ metadataSchema: schema }, customDefinitions),
      ).rejects.toThrow(message);
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^Failed to load module at '.*'$/),
        expect.any(Error),
      );
    });

    it("should fail to load invalid keyword definitions", async () => {
      const errorSpy = jest.spyOn(Logger, "error").mockImplementation();

      await expect(
        createService(
          { metadataSchema: {} },
          { keywords: [{ keyword: "1-invalid-name" }] },
        ),
      ).rejects.toThrow("Keyword 1-invalid-name has invalid name");
      expect(errorSpy).toHaveBeenCalledWith(
        expect.stringMatching(/^Failed to load module at '.*'$/),
        expect.any(Error),
      );
    });
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

    it.each([
      [true, null],
      [
        false,
        [expect.objectContaining({ message: "boolean schema is false" })],
      ],
    ])(
      "should preserve boolean metadataSchema %s semantics",
      async (schema, expected) => {
        service = await createService({ metadataSchema: schema });
        const errors = await service.validate({ metadata: { name: "abc" } });
        expect(errors).toEqual(expected);
      },
    );
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

      service = await createService(
        { metadataSchema: schema },
        { dynamicDefaults: new Map([["userDefinedFunction", () => () => 5]]) },
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

      mockDataService.count.mockImplementation(() => 6);
      service = await createService(
        { metadataSchema: schema },
        {
          dynamicDefaults: new Map([
            [
              "userDefinedAsyncFunction",
              async function (ctx: {
                datasetsService: ReadOnlyDatasetsService;
              }) {
                const datasetsCount = await ctx.datasetsService.count({});
                return () => datasetsCount;
              },
            ],
          ]),
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

  describe("Custom Keywords", () => {
    it("should only expose read-only methods on context services", async () => {
      let context: ValidationContext | undefined;
      service = await createService(
        { metadataSchema: { captureContext: true } },
        {
          keywords: [
            {
              keyword: "captureContext",
              validate: function (this: ValidationContext) {
                context = { ...this };
                return true;
              },
            },
          ],
        },
      );

      await service.validate({ metadata: {} });

      for (const name of [
        "proposalService",
        "datasetsService",
        "attachmentsService",
      ] as const) {
        expect(Object.keys(context![name]).sort()).toEqual([
          "count",
          "findAll",
          "findOne",
        ]);
        expect(Object.isFrozen(context![name])).toBe(true);
      }

      await context!.datasetsService.count({});
      expect(mockDataService.count).toHaveBeenCalledWith({});
    });

    it("should pass the validation context to synchronous keywords", async () => {
      const schema = {
        type: "object",
        properties: { title: { type: "string", matchesPublishedTitle: true } },
      };

      service = await createService(
        { metadataSchema: schema },
        {
          keywords: [
            {
              keyword: "matchesPublishedTitle",
              schema: true,
              schemaType: "boolean",
              validate: function (
                this: ValidationContext,
                schema: boolean,
                data: string,
              ) {
                if (!schema) return true;

                return (
                  data === (this.publishedData as { title?: string }).title
                );
              },
            },
          ],
        },
      );

      let errors = await service.validate({
        title: "abc",
        metadata: { title: "abc" },
      });
      expect(errors).toBeNull();

      errors = await service.validate({
        title: "abc",
        metadata: { title: "xyz" },
      });
      expect(errors).toHaveLength(1);
      expect(errors![0].keyword).toBe("matchesPublishedTitle");
    });

    it("should handle asynchronous keywords using the validation context", async () => {
      const schema = {
        type: "object",
        properties: {
          proposalId: { type: "string", proposalExists: true },
          relatedProposalId: { type: "string", proposalExists: false },
        },
      };

      mockDataService.findOne.mockImplementation(
        async (filter: { where: { proposalId: string } }) =>
          filter.where.proposalId === "prop-123" ? {} : null,
      );

      service = await createService(
        { metadataSchema: schema },
        {
          keywords: [
            {
              keyword: "proposalExists",
              async: true,
              schema: true,
              schemaType: "boolean",
              validate: async function (
                this: ValidationContext,
                schema: boolean,
                data: string,
              ) {
                if (!schema) return true;

                const proposal = await this.proposalService.findOne({
                  where: { proposalId: data },
                });
                return proposal !== null;
              },
            },
          ],
        },
      );

      let errors = await service.validate({
        metadata: { proposalId: "prop-123", relatedProposalId: "prop-999" },
      });
      expect(errors).toBeNull();
      expect(mockDataService.findOne).toHaveBeenCalledTimes(1);

      errors = await service.validate({ metadata: { proposalId: "prop-999" } });
      expect(mockDataService.findOne).toHaveBeenCalledWith({
        where: { proposalId: "prop-999" },
      });
      expect(errors).toHaveLength(1);
      expect(errors![0].keyword).toBe("proposalExists");
    });

    it("should report custom errors from asynchronous keywords", async () => {
      const schema = {
        type: "object",
        properties: { proposalId: { type: "string", proposalExists: true } },
      };

      mockDataService.findOne.mockResolvedValue(null);

      service = await createService(
        { metadataSchema: schema },
        {
          keywords: [
            {
              keyword: "proposalExists",
              async: true,
              schema: true,
              schemaType: "boolean",
              validate: async function (
                this: ValidationContext,
                schema: boolean,
                data: string,
              ) {
                if (!schema) return true;

                const proposal = await this.proposalService.findOne({
                  where: { proposalId: data },
                });
                if (proposal === null) {
                  throw new ValidationError([
                    {
                      keyword: "proposalExists",
                      message: `proposal '${data}' does not exist`,
                      params: { proposalId: data },
                    },
                  ]);
                }
                return true;
              },
            },
          ],
        },
      );

      const errors = await service.validate({
        metadata: { proposalId: "prop-999" },
      });
      expect(errors).toEqual([
        expect.objectContaining({
          keyword: "proposalExists",
          instancePath: "/proposalId",
          message: "proposal 'prop-999' does not exist",
          params: { proposalId: "prop-999" },
        }),
      ]);
    });
  });
});
