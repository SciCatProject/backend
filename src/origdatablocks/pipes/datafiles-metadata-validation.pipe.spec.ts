import { BadRequestException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { DatafilesMetadataValidationPipe } from "./datafiles-metadata-validation.pipe";

type OrigdatablockInput = Parameters<
  DatafilesMetadataValidationPipe["transform"]
>[0];

const schema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  type: "object",
  properties: {
    duration: { type: "number" },
    measurement_type: { type: "string" },
  },
};

const createPipe = (
  datafilesMetadataSchema?: Record<string, unknown>,
): DatafilesMetadataValidationPipe => {
  const configService = {
    get: jest.fn((key: string) =>
      key === "datafilesMetadataSchema" ? datafilesMetadataSchema : undefined,
    ),
  } as unknown as ConfigService;

  return new DatafilesMetadataValidationPipe(configService);
};

const createOrigdatablockDto = (metadata?: Record<string, unknown>) =>
  ({
    datasetId: "test-dataset",
    size: 1,
    dataFileList: [
      {
        path: "file.nxs",
        size: 10000,
        time: "2026-06-01T00:00:00.000Z",
        ...(metadata === undefined ? {} : { metadata }),
      },
    ],
  }) as unknown as OrigdatablockInput;

const expectBadRequest = (callback: () => void, message: string) => {
  let thrownError: unknown;

  try {
    callback();
  } catch (error) {
    thrownError = error;
  }

  expect(thrownError).toBeInstanceOf(BadRequestException);
  expect((thrownError as BadRequestException).message).toContain(message);
};

describe("DatafilesMetadataValidationPipe", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("should allow datafiles without metadata when no schema is configured", () => {
    const pipe = createPipe();
    const dto = createOrigdatablockDto();

    expect(pipe.transform(dto)).toEqual(dto);
  });

  it("should reject datafile metadata when no schema is configured", () => {
    const pipe = createPipe();
    const dto = createOrigdatablockDto({ duration: 12.5 });

    expectBadRequest(
      () => pipe.transform(dto),
      "metadata must NOT have additional properties",
    );
  });

  it("should allow datafile metadata that matches the configured schema", () => {
    const pipe = createPipe(schema);
    const dto = createOrigdatablockDto({
      duration: 12.5,
      measurement_type: "scan",
    });

    expect(pipe.transform(dto)).toEqual(dto);
  });

  it("should reject datafile metadata that does not match the configured schema", () => {
    const pipe = createPipe(schema);
    const dto = createOrigdatablockDto({
      duration: "12.5",
      measurement_type: "scan",
    });

    expectBadRequest(
      () => pipe.transform(dto),
      "Datafile metadata is not following the configured schema",
    );
  });

  it("should allow undeclared top-level metadata keys by deafult", () => {
    const pipe = createPipe({
      type: "object",
      properties: {
        duration: { type: "number" },
      },
      additionalProperties: true,
    });
    const dto = createOrigdatablockDto({
      duration: 12.5,
      operator_comment: "extra field",
    });

    expect(pipe.transform(dto)).toEqual(dto);
  });

  it("should reject non empty metadata with default schema", () => {
    const pipe = createPipe();
    const dto = createOrigdatablockDto({
      operator_comment: "extra field",
    });

    expectBadRequest(
      () => pipe.transform(dto),
      "Datafile metadata is not following the configured schema",
    );
  });

  it("should allow patch Origdatablock bodies without dataFileList / no validation", () => {
    const pipe = createPipe(schema);
    const dto = {
      ownerGroup: "group1",
    } as unknown as OrigdatablockInput;

    expect(pipe.transform(dto)).toEqual(dto);
  });

  it("should validate every datafile in dataFileList", () => {
    const pipe = createPipe(schema);
    const dto = {
      datasetId: "test-dataset",
      size: 2,
      dataFileList: [
        {
          path: "valid.nxs",
          size: 1,
          time: "2026-01-01T00:00:00.000Z",
          metadata: {
            duration: 12.5,
            measurement_type: "scan",
          },
        },
        {
          path: "invalid.nxs",
          size: 1,
          time: "2026-01-02T00:00:00.000Z",
          metadata: {
            duration: "12.5",
            measurement_type: "scan",
          },
        },
      ],
    } as unknown as OrigdatablockInput;

    expectBadRequest(
      () => pipe.transform(dto),
      "Datafile metadata is not following the configured schema",
    );
  });
});
