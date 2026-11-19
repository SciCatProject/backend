import { ConfigService } from "@nestjs/config";
import { Test, TestingModule } from "@nestjs/testing";
import { RabbitMQService } from "./rabbitmq.service";
import { connect as amqplibConnect } from "amqplib";

jest.mock("amqplib", () => ({
  connect: jest.fn(),
}));

describe("RabbitMQService", () => {
  let rabbitMQService: RabbitMQService;

  class ConfigServiceMock {
    get(key: string) {
      switch (key) {
        case "rabbitMq.hostname":
          return "localhost";
        case "rabbitMq.port":
          return 5672;
        case "rabbitMq.username":
          return "guest";
        case "rabbitMq.password":
          return "guest";
        default:
          return undefined;
      }
    }
  }

  const mockChannel = {
    assertQueue: jest.fn(),
    assertExchange: jest.fn(),
    bindQueue: jest.fn(),
    publish: jest.fn(),
    close: jest.fn(),
  };

  const mockConnection = {
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn(),
  };

  beforeEach(async () => {
    (amqplibConnect as jest.Mock).mockResolvedValue(mockConnection);
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RabbitMQService,
        { provide: ConfigService, useClass: ConfigServiceMock },
      ],
    }).compile();
    rabbitMQService = module.get<RabbitMQService>(RabbitMQService);
  });

  it("should be defined", () => {
    expect(rabbitMQService).toBeDefined();
  });

  it("should getValueFromConfig", () => {
    const port = rabbitMQService.getValueFromConfig("port");
    expect(port).toEqual(5672);
  });

  it("should getValueFromConfig but throw error", () => {
    expect(() => rabbitMQService.getValueFromConfig("notExist")).toThrow(
      "RabbitMQ is enabled but missing the config variable notExist.",
    );
  });

  it("should parseConfig", () => {
    rabbitMQService.parseConfig();
    expect(rabbitMQService["connectionOptions"]).toEqual({
      hostname: "localhost",
      port: 5672,
      username: "guest",
      password: "guest",
      protocol: "amqp",
    });
  });

  it("should parseConfig but throw error", () => {
    jest
      .spyOn(rabbitMQService["configService"], "get")
      .mockReturnValue(undefined);
    expect(() => rabbitMQService.parseConfig()).toThrow(
      "RabbitMQ is enabled but missing the config variable hostname.",
    );
  });

  it("should connect", async () => {
    await rabbitMQService["connect"]();
    expect(amqplibConnect).toHaveBeenCalledWith(
      rabbitMQService["connectionOptions"],
    );
    expect(mockConnection.createChannel).toHaveBeenCalled();
    expect(rabbitMQService["channel"]).toBe(mockChannel);
    expect(rabbitMQService["connection"]).toBe(mockConnection);
  });

  it("should connect but log error", async () => {
    (amqplibConnect as jest.Mock).mockRejectedValueOnce(
      new Error("Connection error"),
    );
    await expect(rabbitMQService["connect"]()).rejects.toThrow(
      "Cannot connect to RabbitMQ",
    );
  });

  describe("connect failure message", () => {
    beforeEach(() => rabbitMQService.parseConfig());

    it("should include host, port and the driver error, and keep the cause", async () => {
      const driverError = new Error("Connection error");
      (amqplibConnect as jest.Mock).mockRejectedValueOnce(driverError);
      const error = await rabbitMQService["connect"]().catch((e) => e);
      expect(error.message).toBe(
        "Cannot connect to RabbitMQ at localhost:5672: Connection error",
      );
      expect(error.cause).toBe(driverError);
    });

    it("should use the inner errors of an AggregateError with an empty message", async () => {
      (amqplibConnect as jest.Mock).mockRejectedValueOnce(
        new AggregateError([
          new Error("connect ECONNREFUSED ::1:5672"),
          new Error("connect ECONNREFUSED 127.0.0.1:5672"),
        ]),
      );
      await expect(rabbitMQService["connect"]()).rejects.toThrow(
        "Cannot connect to RabbitMQ at localhost:5672: connect ECONNREFUSED ::1:5672, connect ECONNREFUSED 127.0.0.1:5672",
      );
    });

    it("should fall back to the error code", async () => {
      (amqplibConnect as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error(""), { code: "ECONNREFUSED" }),
      );
      await expect(rabbitMQService["connect"]()).rejects.toThrow(
        "Cannot connect to RabbitMQ at localhost:5672: ECONNREFUSED",
      );
    });

    it("should not include the password", async () => {
      (amqplibConnect as jest.Mock).mockRejectedValueOnce(new Error("refused"));
      const error = await rabbitMQService["connect"]().catch((e) => e);
      expect(error.message).not.toContain("guest");
    });
  });

  it("should bindQueue", async () => {
    await rabbitMQService["connect"]();
    await rabbitMQService["bindQueue"]("q", "ex", "key");
    expect(mockChannel.assertQueue).toHaveBeenCalledWith("q", {
      durable: true,
    });
    expect(mockChannel.assertExchange).toHaveBeenCalledWith("ex", "topic", {
      durable: true,
    });
    expect(mockChannel.bindQueue).toHaveBeenCalledWith("q", "ex", "key");
  });

  it("should bindQueue but throw error", async () => {
    mockChannel.assertQueue.mockRejectedValueOnce(new Error("Queue error"));
    await expect(
      rabbitMQService["bindQueue"]("bad-queue", "ex", "key"),
    ).rejects.toThrow(
      "Could not connect to RabbitMQ queue bad-queue with exchange ex and key key.",
    );
  });

  it("should sendMessage", async () => {
    await rabbitMQService["connect"]();
    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn<any, string>(rabbitMQService, "bindQueue")
      .mockResolvedValue(undefined);
    await rabbitMQService.sendMessage("q", "ex", "key", "msg");
    expect(mockChannel.publish).toHaveBeenCalledWith(
      "ex",
      "key",
      Buffer.from("msg"),
      { persistent: true },
    );
  });

  it("should sendMessage but throw error", async () => {
    jest
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .spyOn<any, string>(rabbitMQService, "bindQueue")
      .mockResolvedValue(undefined);
    mockChannel.publish.mockRejectedValueOnce(new Error("Publish error"));
    await expect(
      rabbitMQService.sendMessage("q", "ex", "key", "msg"),
    ).rejects.toThrow("Could not send message to RabbitMQ queue q.");
  });
});
