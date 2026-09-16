import { GrayLogLogger } from "@user-office-software/duo-logger";
import { GrayLoggerConfig } from "../interfaces/grayLoggerConfig.interface";
import { Logger } from "../interfaces/logger.interface";

export default class GrayLogger implements Logger {
  private logger: GrayLogLogger;
  constructor(config: GrayLoggerConfig) {
    if (!config?.server || !config.port) {
      throw new Error(
        "GrayLogger requires 'server' and 'port' in loggers.json",
      );
    }
    this.logger = new GrayLogLogger(
      config.server,
      config.port,
      {
        facility: config.facility,
        environment: config.environment,
        service: config.service,
      },
      [],
    );
  }
  log(message: string, context: Record<string, unknown>): void {
    this.logger.logInfo(message, context);
  }
  error(message: string, context: Record<string, unknown>): void {
    this.logger.logError(message, context);
  }
  warn(message: string, context: Record<string, unknown>): void {
    this.logger.logWarn(message, context);
  }
  debug(message: string, context: Record<string, unknown>): void {
    this.logger.logDebug(message, context);
  }
  exception(
    message: string,
    exception: unknown,
    context: Record<string, unknown> | undefined,
  ): void {
    this.logger.logException(message, exception, context);
  }
}
