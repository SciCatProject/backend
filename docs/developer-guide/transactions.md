---
title: MongoDB Transactional Support
audience: Technical
created_by: minottic
created_on: 2026-08-04
---

# MongoDB Transactional Support

> ⚠️ **Warning:** MongoDB transactions require the server to be running as a
> **replica set** (or a sharded cluster) — they are not supported on a
> standalone `mongod`, which is what most local/dev setups use by default.
> See MongoDB's docs on [transactions](https://www.mongodb.com/docs/manual/core/transactions/)
> and on [deploying a replica set](https://www.mongodb.com/docs/manual/tutorial/deploy-replica-set/)
> for details. `MongoTransactionService` detects this automatically and
> falls back to running without a transaction rather than failing — see
> [Deployments without replica sets](#deployments-without-replica-sets) below.

## Overview

This is the framework for running MongoDB operations atomically inside a
transaction. It's introduced here without being applied to any service yet —
later PRs will opt specific methods into it. This document explains what's
available and what a PR needs to do to actually use it.

The pieces:

- `MongoTransactionService` (`src/common/services/mongo-transaction.service.ts`) —
  the core primitive. Runs a function inside a MongoDB session/transaction.
- `@Transactional()` (`src/common/decorators/transactional.decorator.ts`) —
  a method decorator that wraps a whole method body in
  `MongoTransactionService.run()`, so you don't have to call it by hand.

Session propagation to queries, saves, and aggregates is handled by
mongoose itself via
[`transactionAsyncLocalStorage`](https://mongoosejs.com/docs/transactions.html#asynclocalstorage),
enabled once at startup in `main.ts`. There's no project-specific plumbing
for it and nothing to opt a schema into.

## Core concept: the ambient session

Once inside a transaction, mongoose makes the active `ClientSession`
"ambient" for the duration of the wrapped function — every query, save, and
aggregate started from within it automatically joins the transaction,
without passing `{ session }` explicitly. This is what lets you write:

```ts
return this.mongoTransactionService.run(async () => {
  const [dataset] = await this.datasetModel.create([dto]);
  await this.datablocksService.createBlocks(dataset);
  return dataset;
});
```

instead of manually threading `{ session }` through every call. An explicit
`{ session }` passed to any individual query always wins over the ambient
one.

## How to use it

### 1. Injecting `MongoTransactionService`

Both the decorator and calling `run()` directly require the owning class to
inject `MongoTransactionService` via its constructor:

```ts
@Injectable()
export class DatasetsService {
  constructor(
    private readonly mongoTransactionService: MongoTransactionService,
    @InjectModel(Dataset.name) private datasetModel: Model<DatasetDocument>,
  ) {}
}
```

### 2. Using `@Transactional()`

For the common case — wrap this whole method in a transaction — annotate
the method. The property **must** be named `mongoTransactionService`; the
decorator reads it off `this` at call time:

```ts
@Transactional()
async updateOne(id: string, update: UpdateDatasetDto) {
  const dataset = await this.datasetModel.findOneAndUpdate({ _id: id }, update);
  await this.recomputeCounts(dataset); // also joins the same transaction
  return dataset;
}
```

The decorated method must be `async` and return a `Promise`. If the owning
class doesn't inject `MongoTransactionService` as `this.mongoTransactionService`,
calling the method throws a clear error naming the class and the fix needed,
rather than a generic "cannot read properties of undefined."

### 3. Calling `MongoTransactionService.run()` directly

Use this when you need more control than a bare decorator gives you, or when
you're not inside a class that has `@Transactional()` available.

`fn` always receives the session as its argument, in addition to it being
made ambient — use whichever is more convenient at each call site. Passing
it explicitly is necessary for anything the ambient session can't reach —
raw driver-level collection methods like `bulkWrite`:

```ts
return this.mongoTransactionService.run(async (session) => {
  return this.datasetModel.collection.bulkWrite(operations, { session });
});
```

— or for calling a method directly on the session itself, rather than
attaching it to a query. For example, ending the transaction early based on
a business check instead of throwing an error — the driver explicitly
supports this: if `fn` calls `session.abortTransaction()` itself, the
transaction is aborted without attempting to commit:

```ts
return this.mongoTransactionService.run(async (session) => {
  const [dataset] = await this.datasetModel.create([dto]);
  if (!isStillValid(dataset)) {
    await session.abortTransaction();
    return null;
  }
  return dataset;
});
```

### Nesting

Calling `run()` (or a `@Transactional()` method) from inside another active
`run()` call throws. Mongoose's `connection.transaction()` doesn't join an
outer transaction when nested — it starts an independent one, on its own
session. That's dangerous to allow silently: the nested transaction could
commit even if the outer one later rolls back (breaking atomicity), and it
wouldn't see the outer transaction's uncommitted writes (breaking
isolation). `MongoTransactionService.run()` detects this and throws instead.

If you need to share logic between a transactional method and its callers,
pull the shared logic into a plain method (not decorated, not calling
`run()` itself) and call that directly — its queries still join the ambient
transaction automatically, the same as any other query inside `fn`.

## Deployments without replica sets

`MongoTransactionService.run()` detects when the deployment doesn't support
transactions (e.g. a standalone `mongod`, common in local/CI) and falls back
to running `fn` without a session, rather than throwing. The result is
cached on the service instance after the first failed attempt, so later
calls skip straight to the fallback instead of repeatedly starting and
failing a transaction.

## Watch out for un-awaited promises

Because the session is scoped to the lifetime of the wrapped function's
returned promise, an async call started inside a `@Transactional()` method
(or a `run()` callback) but not `await`-ed can still be in flight when the
transaction commits and the session closes — leading to a driver error, or a
write racing the commit and silently getting lost. Every async call inside a
transactional method must be awaited. This project enforces
`@typescript-eslint/no-floating-promises` and
`@typescript-eslint/no-misused-promises` project-wide, which catches the
common accidental cases (a forgotten `await`, `array.forEach(async ...)`) —
but not a deliberately `void`-marked call, or a callback registered through
a loosely-typed API. Those still require care in review.
