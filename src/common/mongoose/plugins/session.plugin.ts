import { ClientSession, Schema } from "mongoose";
import { getCurrentSession } from "../../utils/session-context.util";

interface SessionCapableQuery {
  session(session: ClientSession | null): unknown;
  getOptions(): { session?: ClientSession | null };
}

interface SessionCapableAggregate {
  session(session: ClientSession | null): unknown;
  options?: { session?: ClientSession | null };
}

interface SessionCapableDocument {
  $session(session?: ClientSession | null): ClientSession | null | undefined;
}

/**
 * Attaches the ambient session to a mongoose query, aggregate, or
 * document context, unless it already has a session of its own —
 * explicit `session: null` counts as "of its own" too, so this checks
 * for the key's presence rather than truthiness.
 * @param context The query, aggregate, or document to attach to.
 */
export function attachAmbientSession(
  context:
    SessionCapableQuery | SessionCapableAggregate | SessionCapableDocument,
): void {
  const session = getCurrentSession();
  if (!session) return;

  if ("$session" in context) {
    if (context.$session() === undefined) context.$session(session);
    return;
  }

  if ("getOptions" in context) {
    if (!("session" in context.getOptions())) context.session(session);
    return;
  }

  if (!context.options || !("session" in context.options)) {
    context.session(session);
  }
}

// Mirrors mongoose's own `queryOperations` list (lib/constants.js) — every
// operation type mongoose recognizes as query middleware.
type QueryMiddlewareOp =
  | "countDocuments"
  | "distinct"
  | "estimatedDocumentCount"
  | "find"
  | "findOne"
  | "findOneAndReplace"
  | "findOneAndUpdate"
  | "replaceOne"
  | "updateMany"
  | "updateOne"
  | "deleteMany"
  | "deleteOne"
  | "findOneAndDelete";

const QUERY_MIDDLEWARE_OPS: QueryMiddlewareOp[] = [
  "countDocuments",
  "distinct",
  "estimatedDocumentCount",
  "find",
  "findOne",
  "findOneAndReplace",
  "findOneAndUpdate",
  "replaceOne",
  "updateMany",
  "updateOne",
  "deleteMany",
  "deleteOne",
  "findOneAndDelete",
];

/**
 * Mongoose plugin that attaches the active transaction session to every
 * query, aggregate, and save on the schema, unless that operation already
 * specifies its own.
 * @param schema The schema to attach the hooks to.
 * @example
 * DatablockSchema.plugin(sessionPlugin);
 */
export function sessionPlugin(schema: Schema) {
  schema.pre(
    QUERY_MIDDLEWARE_OPS,
    function (this: SessionCapableQuery, next: () => void) {
      attachAmbientSession(this);
      next();
    },
  );

  schema.pre(
    "aggregate",
    function (this: SessionCapableAggregate, next: () => void) {
      attachAmbientSession(this);
      next();
    },
  );

  schema.pre("save", function (this: SessionCapableDocument, next: () => void) {
    attachAmbientSession(this);
    next();
  });
}
