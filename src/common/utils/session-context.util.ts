import { AsyncLocalStorage } from "async_hooks";
import { ClientSession } from "mongoose";

/**
 * Holds the currently active MongoDB transaction session, if any.
 */
const asyncLocalStorage = new AsyncLocalStorage<ClientSession>();

/**
 * Runs `fn` with `session` as the current session for its duration (and
 * everything it awaits), so `getCurrentSession()` picks it up anywhere in
 * that call chain without it being passed explicitly.
 * @param session The session to make current for `fn`.
 * @param fn The operation to run within the session's scope.
 * @returns Whatever `fn` resolves to.
 */
export function runWithSession<T>(
  session: ClientSession,
  fn: () => Promise<T>,
): Promise<T> {
  return asyncLocalStorage.run(session, fn);
}

/**
 * Gets the session set by the nearest enclosing `runWithSession` call.
 * @returns The current session, or `undefined` outside a transaction.
 */
export function getCurrentSession(): ClientSession | undefined {
  return asyncLocalStorage.getStore();
}
