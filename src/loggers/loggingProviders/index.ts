import DefaultLogger from "./defaultLogger";
import GrayLogger from "./grayLogger";
import { Logger } from "../interfaces/logger.interface";
import { GrayLoggerConfig } from "../interfaces/grayLoggerConfig.interface";

export type LoggerConstructor = new (
  config?: Record<string, unknown>,
) => Logger;

export const LOGGER_PROVIDERS: Record<
  string,
  (config?: Record<string, unknown>) => Logger
> = {
  DefaultLogger: () => new DefaultLogger(),
  GrayLogger: (config) => new GrayLogger(config as unknown as GrayLoggerConfig),
};
