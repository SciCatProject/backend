import { MongoServerError } from "mongodb";
import { MongoTransactionService } from "./mongo-transaction.service";
import { getCurrentSession } from "../utils/session-context.util";

describe("MongoTransactionService", () => {
  const mockSession = {
    withTransaction: jest.fn().mockImplementation((fn) => fn()),
    endSession: jest.fn().mockResolvedValue(undefined),
  };

  const connection = {
    startSession: jest.fn().mockResolvedValue(mockSession),
  };

  let service: MongoTransactionService;

  beforeEach(() => {
    jest.clearAllMocks();
    mockSession.withTransaction.mockImplementation((fn) => fn());
    connection.startSession.mockResolvedValue(mockSession);
    service = new MongoTransactionService(connection as never);
  });

  it("runs fn with the session available via getCurrentSession", async () => {
    const result = await service.run(async () => getCurrentSession());

    expect(result).toBe(mockSession);
    expect(mockSession.endSession).toHaveBeenCalled();
  });

  it("also passes the session explicitly as fn's argument", async () => {
    const fn = jest.fn().mockResolvedValue("done");

    await service.run(fn);

    expect(fn).toHaveBeenCalledWith(mockSession);
  });

  it("does not leak the session outside of run", async () => {
    await service.run(async () => getCurrentSession());

    expect(getCurrentSession()).toBeUndefined();
  });

  it("falls back to a non-transactional run when transactions are not supported", async () => {
    const notSupportedError = new MongoServerError({
      message:
        "Transaction numbers are only allowed on a replica set member or mongos",
    });
    notSupportedError.code = 20;
    mockSession.withTransaction.mockImplementationOnce(() => {
      throw notSupportedError;
    });
    const fn = jest.fn().mockImplementation(async () => getCurrentSession());

    const result = await service.run(fn);

    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith(undefined);
    expect(result).toBeUndefined();
    expect(mockSession.endSession).toHaveBeenCalled();
  });

  it("caches unsupported-transactions detection so later calls skip starting a session", async () => {
    const notSupportedError = new MongoServerError({
      message:
        "Transaction numbers are only allowed on a replica set member or mongos",
    });
    notSupportedError.code = 20;
    mockSession.withTransaction.mockImplementationOnce(() => {
      throw notSupportedError;
    });

    await service.run(async () => "first");
    await service.run(async () => "second");

    expect(connection.startSession).toHaveBeenCalledTimes(1);
  });

  it("rethrows errors that are not the transactions-not-supported case", async () => {
    const otherError = new MongoServerError({ message: "boom" });
    otherError.code = 11000;
    mockSession.withTransaction.mockImplementationOnce(() => {
      throw otherError;
    });

    await expect(service.run(async () => "unreachable")).rejects.toThrow(
      otherError,
    );
    expect(mockSession.endSession).toHaveBeenCalled();
  });

  it("ends the session even when fn rejects", async () => {
    await expect(
      service.run(async () => {
        throw new Error("fn failed");
      }),
    ).rejects.toThrow("fn failed");
    expect(mockSession.endSession).toHaveBeenCalled();
  });

  it("joins an already-active transaction instead of starting a nested one", async () => {
    const sessionsSeen: unknown[] = [];

    const result = await service.run(async () => {
      sessionsSeen.push(getCurrentSession());
      return service.run(async () => {
        sessionsSeen.push(getCurrentSession());
        return "nested-done";
      });
    });

    expect(result).toBe("nested-done");
    expect(connection.startSession).toHaveBeenCalledTimes(1);
    expect(mockSession.endSession).toHaveBeenCalledTimes(1);
    expect(sessionsSeen).toEqual([mockSession, mockSession]);
  });

  describe("ambient: false", () => {
    it("passes the session as fn's argument without making it ambient", async () => {
      const fn = jest.fn().mockImplementation(async () => getCurrentSession());

      const result = await service.run(fn, {
        ambient: false,
      });

      expect(fn).toHaveBeenCalledWith(mockSession);
      expect(result).toBeUndefined();
    });

    it("starts an independent transaction when nested without existingSession", async () => {
      const result = await service.run(
        async () =>
          service.run(async () => "nested-done", {
            ambient: false,
          }),
        { ambient: false },
      );

      expect(result).toBe("nested-done");
      expect(connection.startSession).toHaveBeenCalledTimes(2);
      expect(mockSession.endSession).toHaveBeenCalledTimes(2);
    });

    it("joins the given existingSession instead of starting a new transaction", async () => {
      const fn = jest.fn().mockResolvedValue("done");

      const result = await service.run(fn, {
        ambient: false,
        existingSession: mockSession as never,
      });

      expect(result).toBe("done");
      expect(fn).toHaveBeenCalledWith(mockSession);
      expect(connection.startSession).not.toHaveBeenCalled();
    });

    it("falls back to a non-transactional run when transactions are not supported", async () => {
      const notSupportedError = new MongoServerError({
        message:
          "Transaction numbers are only allowed on a replica set member or mongos",
      });
      notSupportedError.code = 20;
      mockSession.withTransaction.mockImplementationOnce(() => {
        throw notSupportedError;
      });
      const fn = jest.fn().mockResolvedValue("done");

      const result = await service.run(fn, {
        ambient: false,
      });

      expect(fn).toHaveBeenCalledWith(undefined);
      expect(result).toBe("done");
    });

    it("shares the unsupported-transactions cache with the ambient mode", async () => {
      const notSupportedError = new MongoServerError({
        message:
          "Transaction numbers are only allowed on a replica set member or mongos",
      });
      notSupportedError.code = 20;
      mockSession.withTransaction.mockImplementationOnce(() => {
        throw notSupportedError;
      });

      await service.run(async () => "first");
      const fn = jest.fn().mockResolvedValue("second");
      await service.run(fn, { ambient: false });

      expect(connection.startSession).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith(undefined);
    });
  });
});
