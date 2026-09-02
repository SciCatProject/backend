import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ScicatLogger } from "./logger.service";
import { LOGGER_PROVIDERS } from "./loggingProviders";
import DefaultLogger from "./loggingProviders/defaultLogger";
import GrayLogger from "./loggingProviders/grayLogger";

describe("LoggerService", () => {
  let service: ScicatLogger;

  const makeFakeLogger = () => ({
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    exception: jest.fn(),
  });

  const mockConfigService = {
    get: jest.fn().mockImplementation(() => [
      {
        type: "DefaultLogger",
        modulePath: "./loggingProviders/defaultLogger",
        config: {},
      },
    ]),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScicatLogger,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
      ],
    }).compile();
    service = module.get<ScicatLogger>(ScicatLogger);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should properly load CustomLogger", () => {
    expect(service).toBeDefined();
  });

  it("should instantiate loggers from config", async () => {
    await service.onModuleInit();

    expect(mockConfigService.get).toHaveBeenCalledWith("loggerConfigs");
    expect(service["loggers"]).toHaveLength(1);
    expect(service["loggers"][0]).toBeInstanceOf(DefaultLogger);
  });

  it("should create no loggers for an empty config array", async () => {
    mockConfigService.get.mockReturnValueOnce([]);
    await service.onModuleInit();

    expect(service["loggers"]).toHaveLength(0);
  });

  it("should forward log calls to every logger", () => {
    const first = makeFakeLogger();
    const second = makeFakeLogger();
    service["loggers"] = [first, second];

    service.log("hello", { user: "test_user" });

    expect(first.log).toHaveBeenCalledWith("hello", { user: "test_user" });
    expect(second.log).toHaveBeenCalledWith("hello", { user: "test_user" });
  });

  it("should forward exception with all three arguments", () => {
    const fakeLogger = makeFakeLogger();
    service["loggers"] = [fakeLogger];

    const err = new Error("boom");
    service.exception("failed", err, { requestUrl: "/datasets" });

    expect(fakeLogger.exception).toHaveBeenCalledWith("failed", err, {
      requestUrl: "/datasets",
    });
  });

  it("should not let one failing logger stop the others", () => {
    const broken = {
      log: jest.fn(() => {
        throw new Error("down");
      }),
    };
    const working = { log: jest.fn() };
    service["loggers"] = [broken, working] as never;

    expect(() => service.log("still works", {})).not.toThrow();
    expect(working.log).toHaveBeenCalledTimes(1);
  });

  it("should create DefaultLogger without config", () => {
    const logger = LOGGER_PROVIDERS.DefaultLogger();
    expect(logger).toBeInstanceOf(DefaultLogger);
  });

  it("should create GrayLogger with valid config", () => {
    const config = { server: "localhost", port: 12201 };
    const logger = LOGGER_PROVIDERS.GrayLogger(config);
    expect(logger).toBeInstanceOf(GrayLogger);
  });

  it("should throw for GrayLogger without required config", () => {
    expect(() => LOGGER_PROVIDERS.GrayLogger({})).toThrow();
  });
});
