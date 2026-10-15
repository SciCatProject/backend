import { MongoServerError } from "mongodb";
import { MongoTransactionService } from "./mongo-transaction.service";

describe("MongoTransactionService", () => {
  const mockSession = { id: "mock-session" };

  const connection = {
    transaction: jest.fn().mockImplementation((fn) => fn(mockSession)),
  };

  let service: MongoTransactionService;

  beforeEach(() => {
    jest.clearAllMocks();
    connection.transaction.mockImplementation((fn) => fn(mockSession));
    service = new MongoTransactionService(connection as never);
  });

  it("runs fn inside connection.transaction, passing it the session", async () => {
    const fn = jest.fn().mockResolvedValue("done");

    const result = await service.run(fn);

    expect(result).toBe("done");
    expect(fn).toHaveBeenCalledWith(mockSession);
  });

  it("falls back to a non-transactional run when transactions are not supported", async () => {
    const notSupportedError = new MongoServerError({
      message:
        "Transaction numbers are only allowed on a replica set member or mongos",
    });
    notSupportedError.code = 20;
    connection.transaction.mockImplementationOnce(() => {
      throw notSupportedError;
    });
    const fn = jest.fn().mockResolvedValue("done");

    const result = await service.run(fn);

    expect(fn).toHaveBeenCalledWith(undefined);
    expect(result).toBe("done");
  });

  it("caches unsupported-transactions detection so later calls skip connection.transaction", async () => {
    const notSupportedError = new MongoServerError({
      message:
        "Transaction numbers are only allowed on a replica set member or mongos",
    });
    notSupportedError.code = 20;
    connection.transaction.mockImplementationOnce(() => {
      throw notSupportedError;
    });

    await service.run(async () => "first");
    await service.run(async () => "second");

    expect(connection.transaction).toHaveBeenCalledTimes(1);
  });

  it("rethrows errors that are not the transactions-not-supported case", async () => {
    const otherError = new MongoServerError({ message: "boom" });
    otherError.code = 11000;
    connection.transaction.mockImplementationOnce(() => {
      throw otherError;
    });

    await expect(service.run(async () => "unreachable")).rejects.toThrow(
      otherError,
    );
  });

  it("propagates fn's rejection", async () => {
    connection.transaction.mockImplementationOnce((fn) => fn(mockSession));

    await expect(
      service.run(async () => {
        throw new Error("fn failed");
      }),
    ).rejects.toThrow("fn failed");
  });

  it("throws when run() is called again from inside an active transaction", async () => {
    connection.transaction.mockImplementationOnce((fn) => fn(mockSession));

    await expect(
      service.run(async () => service.run(async () => "nested")),
    ).rejects.toThrow(/already inside a transaction/);
  });

  it("does not throw for sequential (non-nested) calls", async () => {
    await service.run(async () => "first");
    const result = await service.run(async () => "second");

    expect(result).toBe("second");
  });

  it("allows nesting when the outer call already fell back to non-transactional", async () => {
    const notSupportedError = new MongoServerError({
      message:
        "Transaction numbers are only allowed on a replica set member or mongos",
    });
    notSupportedError.code = 20;
    connection.transaction.mockImplementationOnce(() => {
      throw notSupportedError;
    });
    await service.run(async () => "prime the fallback cache");

    const result = await service.run(async () =>
      service.run(async () => "nested"),
    );

    expect(result).toBe("nested");
  });
});
