import { Logger } from "@nestjs/common";
import { Connection, MongooseError } from "mongoose";

const LOG_CONTEXT = "MongoDB";

/**
 * Returns the host list of a MongoDB connection string ("host1:27017,host2:27017"),
 * without scheme, credentials, database name or query options, so it is safe to log.
 */
export function getMongoHostsForLogging(uri: string | undefined): string {
  if (!uri) return "<MONGODB_URI not set>";
  const withoutScheme = uri.replace(/^[a-z+]+:\/\//i, "");
  const authority = withoutScheme.split(/[/?]/, 1)[0];
  const hosts = authority.slice(authority.lastIndexOf("@") + 1);
  return hosts || "<unknown host>";
}

/**
 * Logs MongoDB connectivity problems as soon as the driver sees them.
 *
 * Nest buffers logs during bootstrap (bufferLogs in main.ts) and the driver only
 * gives up on server selection after serverSelectionTimeoutMS (30s by default),
 * so without this an unreachable database looks like a silent hang.
 */
export function attachMongoConnectionDiagnostics(
  connection: Connection,
  uri: string | undefined,
): void {
  const hosts = getMongoHostsForLogging(uri);
  let reportedUnreachable = false;

  connection.getClient().on("serverHeartbeatFailed", (event) => {
    if (reportedUnreachable || connection.readyState === 1) return;
    reportedUnreachable = true;
    // Print the buffered bootstrap logs now instead of after all retries fail.
    Logger.flush();
    Logger.error(
      `Cannot connect to MongoDB at ${hosts}: ${event.failure.message}. ` +
        "Is the database running? Still trying...",
      LOG_CONTEXT,
    );
  });

  // Runtime events only: failed initial attempts are already reported above
  // and by the MongooseModule retry log.
  let connected = false;
  connection.once("connected", () => {
    connected = true;
  });
  connection.on("disconnected", () => {
    if (connected)
      Logger.warn(`Disconnected from MongoDB at ${hosts}`, LOG_CONTEXT);
  });
  connection.on("reconnected", () => {
    Logger.log(`Reconnected to MongoDB at ${hosts}`, LOG_CONTEXT);
  });
  connection.on("error", (error: Error) => {
    if (connected) {
      Logger.error(
        `MongoDB connection error (${hosts}): ${error.message}`,
        LOG_CONTEXT,
      );
    }
  });
}

/** Wraps the final connection error with the (credential-free) target hosts. */
export function toMongoConnectionError(
  error: MongooseError,
  uri: string | undefined,
): MongooseError {
  const wrapped = new MongooseError(
    `Cannot connect to MongoDB at ${getMongoHostsForLogging(uri)}: ${error.message}`,
  );
  wrapped.cause = error;
  return wrapped;
}
