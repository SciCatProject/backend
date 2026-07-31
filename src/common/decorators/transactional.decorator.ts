import { MongoTransactionService } from "../services/mongo-transaction.service";

interface WithMongoTransactionService {
  mongoTransactionService: MongoTransactionService;
}

/**
 * Runs the decorated method inside a MongoDB transaction via
 * `MongoTransactionService.run`, joining an already-active transaction
 * instead of nesting a new one when called from another `@Transactional()`
 * method.
 *
 * The session is ambient, read via `getCurrentSession()` by whatever the
 * decorated method calls. The method must be async and return a Promise.
 * The owning class must inject `MongoTransactionService` as
 * `this.mongoTransactionService`.
 */
export function Transactional(): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = async function (
      this: WithMongoTransactionService,
      ...args: unknown[]
    ) {
      if (!this.mongoTransactionService) {
        throw new Error(
          `@Transactional() requires ${this.constructor.name} to inject ` +
            "MongoTransactionService as this.mongoTransactionService",
        );
      }
      return this.mongoTransactionService.run(() =>
        originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}
