import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ScicatLogger } from "./logger.service";
import { LOGGER_PROVIDERS } from "./loggingProviders";
import DefaultLogger from "./loggingProviders/defaultLogger";
import GrayLogger from "./loggingProviders/grayLogger";

class MockDefaultLogger {
  getLogger = jest.fn();
}

jest.mock("./loggingProviders/defaultLogger", () => {
  return {
    __esModule: true,
    default: jest.fn().mockImplementation(() => new MockDefaultLogger()),
  };
});

describe("LoggerService", () => {
  let service: ScicatLogger;

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
