import { Transactional } from "./transactional.decorator";
import { MongoTransactionModule } from "../modules/mongo-transaction.module";
import { MongoTransactionService } from "../services/mongo-transaction.service";
import { getCurrentSession } from "../utils/session-context.util";

function registerMongoTransactionService(service: MongoTransactionService) {
  new MongoTransactionModule(service).onModuleInit();
}

describe("Transactional", () => {
  class TestService {
    @Transactional()
    async withArgs(a: string, b: string) {
      return { a, b };
    }
  }

  let service: TestService;
  const fakeMongoTransactionService = {
    run: jest.fn().mockImplementation((fn) => fn()),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    fakeMongoTransactionService.run.mockImplementation((fn) => fn());
    registerMongoTransactionService(fakeMongoTransactionService as never);
    service = new TestService();
  });

  it("delegates to MongoTransactionService.run and forwards all arguments unchanged", async () => {
    const result = await service.withArgs("x", "y");

    expect(fakeMongoTransactionService.run).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ a: "x", b: "y" });
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
      registerMongoTransactionService(
        new MongoTransactionService(connection as never),
      );
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
