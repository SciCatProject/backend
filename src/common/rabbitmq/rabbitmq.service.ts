import {
  connect as amqplibConnect,
  Options,
  ChannelModel,
  Channel,
} from "amqplib";
import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnApplicationShutdown,
  OnModuleInit,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

function OnError(action: "throw" | "log" = "throw"): MethodDecorator {
  return function (
    target: object,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    descriptor.value = async function (...args: any[]) {
      try {
        return await originalMethod.apply(this, args);
      } catch (error) {
        if (action === "log") {
          Logger.error(
            (this as RabbitMQService)._error +
              JSON.stringify((error as Error).message),
            "RabbitMQService",
          );
        } else {
          throw new Error((this as RabbitMQService)._error, { cause: error });
        }
      }
    };
    return descriptor;
  };
}

/**
 * Service for publishing messages to a RabbitMQ queue.
 */
@Injectable()
export class RabbitMQService
  implements OnModuleInit, OnModuleDestroy, OnApplicationShutdown
{
  private connection: ChannelModel;
  private channel: Channel;
  private static readonly configKeys = [
    "hostname",
    "port",
    "username",
    "password",
  ] as const;
  private connectionOptions: Required<
    Pick<
      Options.Connect,
      (typeof RabbitMQService.configKeys)[number] | "protocol"
    >
  >;
  _error: string;

  constructor(private readonly configService: ConfigService) {}

  getValueFromConfig(key: string): string | number {
    const configValue = this.configService.get(`rabbitMq.${key}`);
    if (!configValue)
      throw new Error(
        `RabbitMQ is enabled but missing the config variable ${key}.`,
      );
    return configValue;
  }

  parseConfig(): void {
    const connectionOptions: Record<string, string | number> = {};
    RabbitMQService.configKeys.forEach(
      (configKey) =>
        (connectionOptions[configKey] = this.getValueFromConfig(configKey)),
    );
    connectionOptions.protocol = "amqp";
    this.connectionOptions = connectionOptions as typeof this.connectionOptions;
  }

  async onModuleInit(): Promise<void> {
    Logger.log("Initializing RabbitMQService.", "RabbitMQService");
    this.parseConfig();
    await this.connect();
  }

  @OnError()
  private async connect(): Promise<void> {
    this._error = "Cannot connect to RabbitMQ";
    this.connection = await amqplibConnect(this.connectionOptions);
    this._error = "Channel error in RabbitMQService: ";
    this.channel = await this.connection.createChannel();
  }

  @OnError()
  private async bindQueue(
    queue: string,
    exchange: string,
    key: string,
    queueArguments?: Record<string, unknown>,
  ) {
    this._error = `Could not connect to RabbitMQ queue ${queue} with exchange ${exchange} and key ${key}.`;
    await this.channel.assertQueue(queue, {
      durable: true,
      ...(queueArguments && { arguments: queueArguments }),
    });
    await this.channel.assertExchange(exchange, "topic", {
      durable: true,
    });
    await this.channel.bindQueue(queue, exchange, key);
  }

  @OnError()
  async sendMessage(
    queue: string,
    exchange: string,
    key: string,
    message: string,
    queueArguments?: Record<string, unknown>,
  ) {
    this._error = `Could not send message to RabbitMQ queue ${queue}.`;
    await this.bindQueue(queue, exchange, key, queueArguments);
    this.channel.publish(exchange, key, Buffer.from(message), {
      persistent: true,
    });
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      Logger.log("RabbitMQ channel closed.", "RabbitMQService");
    }
    if (this.connection) {
      await this.connection.close();
      Logger.log("RabbitMQ connection closed.", "RabbitMQService");
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.close();
  }

  async onApplicationShutdown(): Promise<void> {
    await this.close();
  }
}
