import { RabbitMQJobAction } from "./rabbitmqaction";
import { RabbitMQJobActionOptions } from "./rabbitmqaction.interface";
import { RabbitMQJobActionCreator } from "./rabbitmqaction.service";
import { CreateJobDto } from "../../../../jobs/dto/create-job.dto";
import { JobClass } from "../../../../jobs/schemas/job.schema";
import { RabbitMQService } from "src/common/rabbitmq/rabbitmq.service";
import { ConfigService } from "@nestjs/config";

jest.mock("@nestjs/config");

describe("RabbitMQJobAction", () => {
  const options: RabbitMQJobActionOptions = {
    actionType: "rabbitmq",
    queue: "testQueue",
    exchange: "testExchange",
    key: "testKey",
  };

  const mockConfigService = {
    get: jest.fn((key: string) => {
      switch (key) {
        case "rabbitMq.enabled":
          return "yes";
        case "rabbitMq.hostname":
          return "rabbitmq";
        case "rabbitMq.port":
          return 5672;
        case "rabbitMq.username":
          return "guest";
        case "rabbitMq.password":
          return "guest";
        default:
          return null;
      }
    }),
  };

  const mockRabbitMQService = {
    sendMessage: jest.fn(),
  };

  const action = new RabbitMQJobAction<CreateJobDto>(
    mockConfigService as unknown as ConfigService,
    mockRabbitMQService as unknown as RabbitMQService,
    options,
  );

  it("should be configured successfully", async () => {
    expect(action).toBeDefined();
  });

  it("should connect and send a message to the queue", async () => {
    const job = { id: "12345" } as JobClass;

    const context = { request: job, job, env: {}, datasets: [] };
    await action.perform(context);

    expect(mockRabbitMQService.sendMessage).toHaveBeenCalledWith(
      options.queue,
      options.exchange,
      options.key,
      JSON.stringify(job),
      undefined,
    );
  });

  it("should throw an error if RabbitMQ is not enabled", async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case "rabbitMq.enabled":
            return "no";
          default:
            return null;
        }
      }),
    };

    expect(() => {
      new RabbitMQJobAction<CreateJobDto>(
        mockConfigService as unknown as ConfigService,
        mockRabbitMQService as unknown as RabbitMQService,
        options,
      );
    }).toThrow("RabbitMQService is not enabled.");
  });

  it("should throw an error if options are invalid", async () => {
    const mockConfigService = {
      get: jest.fn((key: string) => {
        switch (key) {
          case "rabbitMq.enabled":
            return "yes";
          case "rabbitMq.hostname":
            return "rabbitmq";
          case "rabbitMq.port":
            return 5672;
          case "rabbitMq.username":
            return "guest";
          case "rabbitMq.password":
            return "guest";
          default:
            return null;
        }
      }),
    };

    const invalidOptions = {
      actionType: "rabbitmq",
      queue: "testQueue",
      exchange: "testExchange",
    };

    const rabbitMQJobActionCreator = new RabbitMQJobActionCreator(
      mockConfigService as unknown as ConfigService,
      mockRabbitMQService as unknown as RabbitMQService,
    );

    expect(() => {
      rabbitMQJobActionCreator.create(
        invalidOptions as RabbitMQJobActionOptions,
      );
    }).toThrow(
      'Invalid options for rabbitmq action: {"actionType":"rabbitmq","queue":"testQueue","exchange":"testExchange"}',
    );
  });

  it("should throw an error if queue arguments are not an object", async () => {
    const rabbitMQJobActionCreator = new RabbitMQJobActionCreator(
      mockConfigService as unknown as ConfigService,
      mockRabbitMQService as unknown as RabbitMQService,
    );

    expect(() => {
      rabbitMQJobActionCreator.create({
        ...options,
        queueArguments: ["x-dead-letter-exchange"],
      } as unknown as RabbitMQJobActionOptions);
    }).toThrow("Invalid options for rabbitmq action");
  });
});
