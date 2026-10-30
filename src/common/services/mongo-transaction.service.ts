import { AsyncLocalStorage } from "async_hooks";
import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { MongoServerError } from "mongodb";
import { ClientSession, Connection } from "mongoose";

const TRANSACTIONS_NOT_SUPPORTED_CODE = 20; // IllegalOperation: no replica set/mongos

// Tracks only whether a real transaction is already in progress, so `run()`
// can reject nesting
const activeTransaction = new AsyncLocalStorage<true>();

@Injectable()
export class MongoTransactionService {
  private transactionsSupported: boolean | undefined;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Runs `fn` inside a MongoDB transaction, falling back to a
   * non-transactional run if the deployment doesn't support transactions
   * (e.g. a standalone `mongod`, common in local/CI).
   *
   * Relies on mongoose's `transactionAsyncLocalStorage` support (enabled in
   * `main.ts`) to attach the session to queries, saves, and aggregates
   * automatically — see https://mongoosejs.com/docs/transactions.html#asynclocalstorage.
   * `fn` also receives the session directly, for the cases that doesn't
   * cover: raw driver calls like `Model.collection.bulkWrite`, or calling
   * `session.abortTransaction()` yourself to end the transaction early.
   *
   * Calling `run()` again from inside `fn` (directly, or via a nested
   * `@Transactional()` method) throws rather than silently starting a
   * second, independent transaction — nesting would run on its own session,
   * so it could commit even if the outer transaction later rolls back, and
   * it wouldn't see the outer transaction's uncommitted writes. Restructure
   * instead: pull the shared logic into a plain method and call that
   * directly, without wrapping it in its own `run()`/`@Transactional()`.
   * @param fn The operation to run inside the transaction.
   * @returns Whatever `fn` resolves to.
   * @example
   * return this.mongoTransactionService.run(async () => {
   *   const [dataset] = await this.datasetModel.create([dto]);
   *   return dataset;
   * });
   */
  async run<T>(
    fn: (session: ClientSession | undefined) => Promise<T>,
  ): Promise<T> {
    if (activeTransaction.getStore()) {
      throw new Error(
        "MongoTransactionService.run() was called while already inside a " +
          "transaction. Nesting would start a second, independent " +
          "transaction rather than joining the outer one - pull the shared " +
          "logic into a plain method and call it directly instead of " +
          "nesting run()/@Transactional() calls.",
      );
    }

    if (this.transactionsSupported === false) return fn(undefined);

    try {
      return await activeTransaction.run(true, () =>
        this.connection.transaction(fn),
      );
    } catch (error) {
      if (
        error instanceof MongoServerError &&
        error.code === TRANSACTIONS_NOT_SUPPORTED_CODE
      ) {
        this.transactionsSupported = false;
        return fn(undefined);
      }
      throw error;
    }
  }
}
