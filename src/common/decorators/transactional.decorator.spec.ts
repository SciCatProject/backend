import { Transactional } from "./transactional.decorator";
import { MongoTransactionService } from "../services/mongo-transaction.service";

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

  it("throws when a @Transactional() method calls another one, on top of the real MongoTransactionService", async () => {
    const connection = {
      transaction: jest.fn().mockImplementation((fn) => fn({})),
    };

    class RealTransactionService {
      mongoTransactionService = new MongoTransactionService(
        connection as never,
      );

      @Transactional()
      async outer() {
        return this.inner();
      }

      @Transactional()
      async inner() {
        return "inner-done";
      }
    }

    await expect(new RealTransactionService().outer()).rejects.toThrow(
      /already inside a transaction/,
    );
  });
});
