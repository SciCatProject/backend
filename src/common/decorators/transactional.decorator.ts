import { getMongoTransactionService } from "../modules/mongo-transaction.module";

/**
 * Runs the decorated method inside a MongoDB transaction via
 * `MongoTransactionService.run`, joining an already-active transaction
 * instead of nesting a new one when called from another `@Transactional()`
 * method.
 *
 * The session is ambient, read via `getCurrentSession()` by whatever the
 * decorated method calls. The method must be async and return a Promise.
 */
export function Transactional(): MethodDecorator {
  return function (
    _target: object,
    _propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) {
    const originalMethod = descriptor.value;

    descriptor.value = function (this: unknown, ...args: unknown[]) {
      return getMongoTransactionService().run(() =>
        originalMethod.apply(this, args),
      );
    };

    return descriptor;
  };
}
