import { Injectable } from "@nestjs/common";
import { InjectConnection } from "@nestjs/mongoose";
import { MongoServerError } from "mongodb";
import { ClientSession, Connection } from "mongoose";
import {
  getCurrentSession,
  runWithSession,
} from "../utils/session-context.util";

const TRANSACTIONS_NOT_SUPPORTED_CODE = 20; // IllegalOperation: no replica set/mongos

type RunOptions =
  { ambient?: true } | { ambient: false; existingSession?: ClientSession };

@Injectable()
export class MongoTransactionService {
  private transactionsSupported: boolean | undefined;

  constructor(@InjectConnection() private readonly connection: Connection) {}

  /**
   * Runs `fn` inside a MongoDB transaction, falling back to a
   * non-transactional run if the deployment doesn't support transactions
   *
   * By default, the session is both passed to `fn` and made ambient (via
   * `getCurrentSession()`/`sessionPlugin`), so nested calls pick it up
   * without it being passed explicitly; nesting inside another `run()`
   * joins that transaction automatically. With `ambient: false`, only
   * `fn`'s argument carries the session — nothing attaches it
   * automatically — and nesting must be done by hand via
   * `existingSession`.
   * @param fn The operation to run. Pass the session if you later
   * want to use it inside the closure.
   * @param options.ambient Set to `false` to disable automatic
   * attachment; see above.
   * @param options.existingSession Only used with `ambient: false`: pass
   * the session from an enclosing call to join it instead of starting a
   * new transaction.
   * @returns Whatever `fn` resolves to.
   * @example
   * return this.mongoTransactionService.run(async () => {
   *   const [dataset] = await this.datasetModel.create([dto]);
   *   return dataset;
   * });
   * @example
   * return this.mongoTransactionService.run(
   *   async (session) => this.datasetModel.create([dto], { session }),
   *   { ambient: false },
   * );
   */
  async run<T>(
    fn: (session: ClientSession | undefined) => Promise<T>,
    options: RunOptions = {},
  ): Promise<T> {
    if (options.ambient === false) {
      if (options.existingSession) return fn(options.existingSession);
    } else {
      const currentSession = getCurrentSession();
      if (currentSession) return fn(currentSession);
    }

    if (this.transactionsSupported === false) return fn(undefined);

    let session: ClientSession | undefined;
    try {
      session = await this.connection.startSession();
      let result!: T;
      await session.withTransaction(async () => {
        result =
          options.ambient === false
            ? await fn(session)
            : await runWithSession(session as ClientSession, () => fn(session));
      });
      return result;
    } catch (error) {
      if (
        error instanceof MongoServerError &&
        error.code === TRANSACTIONS_NOT_SUPPORTED_CODE
      ) {
        this.transactionsSupported = false;
        return fn(undefined);
      }
      throw error;
    } finally {
      if (session) await session.endSession();
    }
  }
}
