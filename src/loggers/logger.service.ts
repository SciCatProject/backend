import { Injectable, OnModuleInit } from "@nestjs/common";
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Logger, LoggerConfig } from "./interfaces/logger.interface";
import { LOGGER_PROVIDERS } from "./loggingProviders";

@Injectable()
export class ScicatLogger implements Logger, OnModuleInit {
  private loggers: Logger[] = [];
  constructor(private configService: ConfigService) {}

  async onModuleInit() {
    const loggerConfigs =
      this.configService.get<LoggerConfig[]>("loggerConfigs");

    if (!loggerConfigs || loggerConfigs.length < 1) {
      console.log('No logger configs found in "loggers.json"');
    } else {
      this.loggers = loggerConfigs.map((loggerConfig) =>
        LOGGER_PROVIDERS[loggerConfig.type](loggerConfig.config),
      );
    }
  }

  private handleLogForwarding(method: keyof Logger, ...args: unknown[]): void {
    for (const logger of this.loggers) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-function-type -- We need to call the method dynamically
        (logger[method] as Function)(...args);
      } catch (error) {
        console.error(error);
      }
    }
  }
  log(message: string, context: Record<string, unknown>) {
    this.handleLogForwarding("log", message, context);
  }

  error(message: string, context: Record<string, unknown>): void {
    this.handleLogForwarding("error", message, context);
  }

  warn(message: string, context: Record<string, unknown>): void {
    this.handleLogForwarding("warn", message, context);
  }

  debug(message: string, context: Record<string, unknown>) {
    this.handleLogForwarding("debug", message, context);
  }

  exception(
    message: string,
    exception: unknown,
    context: Record<string, unknown>,
  ) {
    this.handleLogForwarding("exception", message, exception, context);
  }
}
@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(private readonly logger: ScicatLogger) {}
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();
    const request = ctx.getRequest();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : "Internal server error";

    this.logger.exception(JSON.stringify(message), exception, {
      requestUrl: request.url,
      requestUser: request.user,
      statusCode: status,
    });
    response.status(status).json(message);
  }
}
