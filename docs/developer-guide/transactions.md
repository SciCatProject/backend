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
transaction. It's introduced here without being applied to any schema or
service yet — later PRs will opt specific models and methods into it. This
document explains what's available and what a PR needs to do to actually use
it.

The pieces:

- `MongoTransactionService` (`src/common/services/mongo-transaction.service.ts`) —
  the core primitive. Runs a function inside a MongoDB session/transaction.
- `@Transactional()` (`src/common/decorators/transactional.decorator.ts`) —
  a method decorator that wraps a whole method body in
  `MongoTransactionService.run()`, so you don't have to call it by hand.
- `sessionPlugin` (`src/common/mongoose/plugins/session.plugin.ts`) — a
  mongoose schema plugin that automatically attaches the active transaction
  session to every query, aggregate, and save on that schema, so callers
  don't need to pass `{ session }` explicitly. **Must be registered on a
  schema for that schema's models to participate in transactions
  automatically** — see [Registering the plugin on a schema](#registering-the-plugin-on-a-schema).
- `session-context.util.ts` — the underlying `AsyncLocalStorage` plumbing
  that makes the session "ambient" (see below). You shouldn't need to use
  this directly.

## Core concept: the ambient session

Once inside a transaction, the active `ClientSession` is made "ambient" —
readable via `getCurrentSession()` from anywhere in the same call chain,
without being passed as an argument. `sessionPlugin` uses this to attach the
session to a query automatically. This is what lets you write:

```ts
return this.mongoTransactionService.run(async () => {
  const [dataset] = await this.datasetModel.create([dto]);
  await this.datablocksService.createBlocks(dataset);
  return dataset;
});
```

instead of manually threading `{ session }` through every call, as long as
`DatasetSchema` and the datablock schema have `sessionPlugin` registered.

An explicit `{ session }` passed to any individual query always wins over
the ambient one — including `session: null`, which is respected as "opt this
one query out of the transaction" rather than being treated as "no session
set." See `attachAmbientSession` in `session.plugin.ts` for the exact rule.

## How to use it

### 1. Registering the plugin on a schema

For `sessionPlugin` to have any effect, the model's schema must register it:

```ts
import { sessionPlugin } from "src/common/mongoose/plugins/session.plugin";

// ...after SchemaFactory.createForClass(...)
DatasetSchema.plugin(sessionPlugin);
```

Registering the plugin is a per-schema, opt-in choice — it lets you decide
selectively which models pick up the ambient session automatically. If you
want more control over a given model, and would rather avoid automatic
session pickup for it, simply don't register the plugin on that schema:
queries on it will then only join a transaction when you pass `{ session }`
explicitly. It currently isn't registered on any schema in this codebase.

### 2. Injecting `MongoTransactionService`

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

### 3. Using `@Transactional()`

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

### 4. Calling `MongoTransactionService.run()` directly

Use this when you need more control than a bare decorator gives you, or when
you're not inside a class that has `@Transactional()` available.

`fn` always receives the session as its argument, in addition to it being
made ambient — use whichever is more convenient at each call site.

**Passing the session explicitly** is necessary in two situations, even on
schemas where `sessionPlugin` is already attaching it to your queries
automatically:

- Anything `sessionPlugin` can't reach — it only hooks mongoose
  query/aggregate/document middleware, not raw driver-level collection
  methods like `bulkWrite`:

  ```ts
  return this.mongoTransactionService.run(async (session) => {
    return this.datasetModel.collection.bulkWrite(operations, { session });
  });
  ```

- Calling a method directly on the session itself, rather than attaching it
  to a query — `sessionPlugin` only ever attaches the session *to* queries,
  it never exposes the session object for you to act on. For example,
  ending the transaction early based on a business check instead of
  throwing an error — the driver explicitly supports this: if `fn` calls
  `session.abortTransaction()` itself, `withTransaction` detects that and
  returns without attempting to commit:

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

**Without passing the session** works for everything `sessionPlugin` already
covers — plain mongoose calls just pick up the ambient session on their own,
the same way they would inside a `@Transactional()` method:

```ts
return this.mongoTransactionService.run(async () => {
  const [dataset] = await this.datasetModel.create([dto]);
  await this.datablocksService.createBlocks(dataset);
  return dataset;
});
```

### 5. Explicit mode (`{ ambient: false }`)

By default, `run()` makes the session ambient (as described above). Pass
`{ ambient: false }` to disable that — nothing will be attached
automatically, and every query that should join the transaction must be
given `{ session }` explicitly:

```ts
return this.mongoTransactionService.run(
  async (session) => {
    const [dataset] = await this.datasetModel.create([dto], { session });
    await this.createBlocks(dataset, session); // threaded to a sibling
    return dataset;
  },
  { ambient: false },
);
```

This is useful when you want the transaction boundary to be visible at every
call site rather than implicit, or when working with a schema that doesn't
have `sessionPlugin` registered.

### Nesting

Calling `run()` (or a `@Transactional()` method) from inside another active
`run()` call joins the existing transaction instead of starting a second,
independent one — only the outermost call actually opens a session and
commits/aborts it. This works automatically in the default (ambient) mode.
In explicit mode, nesting isn't auto-detected — pass the session you
received down as `existingSession` to join it:

```ts
return this.mongoTransactionService.run(
  async (session) =>
    this.mongoTransactionService.run(fn, {
      ambient: false,
      existingSession: session,
    }),
  { ambient: false },
);
```

Don't mix ambient and explicit calls inside one another without threading
the session through by hand — the two modes can't detect each other, so
you'd end up with two separate, possibly conflicting transactions instead of
one.

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
