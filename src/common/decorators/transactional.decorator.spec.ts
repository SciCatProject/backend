import { Transactional } from "./transactional.decorator";
import { MongoTransactionService } from "../services/mongo-transaction.service";
import { getCurrentSession } from "../utils/session-context.util";

describe("Transactional", () => {
  class TestService {
    mongoTransactionService = {
      run: jest.fn().mockImplementation((fn) => fn()),
    };

    @Transactional()
    async withArgs(a: string, b: string) {
      return { a, b };
    }
  }

  let service: TestService;

  beforeEach(() => {
    service = new TestService();
  });

  it("delegates to mongoTransactionService.run and forwards all arguments unchanged", async () => {
    const result = await service.withArgs("x", "y");

    expect(service.mongoTransactionService.run).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ a: "x", b: "y" });
  });

  it("throws a clear error when the owning class doesn't inject MongoTransactionService", async () => {
    class MissingService {
      @Transactional()
      async doThing() {
        return "done";
      }
    }

    await expect(new MissingService().doThing()).rejects.toThrow(
      "@Transactional() requires MissingService to inject MongoTransactionService as this.mongoTransactionService",
    );
  });

  describe("nesting on top of the real MongoTransactionService", () => {
    const mockSession = {
      withTransaction: jest.fn().mockImplementation((fn) => fn()),
      endSession: jest.fn().mockResolvedValue(undefined),
    };
    const connection = {
      startSession: jest.fn().mockResolvedValue(mockSession),
    };

    class RealTransactionService {
      mongoTransactionService = new MongoTransactionService(
        connection as never,
      );
      sessionsSeen: unknown[] = [];

      @Transactional()
      async outer() {
        this.sessionsSeen.push(getCurrentSession());
        return this.inner();
      }

      @Transactional()
      async inner() {
        this.sessionsSeen.push(getCurrentSession());
        return "inner-done";
      }
    }

    beforeEach(() => {
      jest.clearAllMocks();
      mockSession.withTransaction.mockImplementation((fn) => fn());
      connection.startSession.mockResolvedValue(mockSession);
    });

    it("joins the outer transaction instead of nesting a second one", async () => {
      const realService = new RealTransactionService();

      const result = await realService.outer();

      expect(result).toBe("inner-done");
      expect(connection.startSession).toHaveBeenCalledTimes(1);
      expect(mockSession.endSession).toHaveBeenCalledTimes(1);
      expect(realService.sessionsSeen).toEqual([mockSession, mockSession]);
    });
  });
});
