import { Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { MongooseModuleFactoryOptions } from "@nestjs/mongoose";
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

// The app opens more than one connection to the same database (AppModule and
// HealthModule), so identical reports within this window are logged only once.
const REPORT_DEDUPE_MS = 5000;
const lastReported = new Map<string, number>();

function reportStartupFailure(message: string): void {
  const now = Date.now();
  if (now - (lastReported.get(message) ?? -Infinity) < REPORT_DEDUPE_MS) return;
  lastReported.set(message, now);
  // Print the buffered bootstrap logs now instead of after all retries fail.
  Logger.flush();
  Logger.error(message, LOG_CONTEXT);
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
  let connected = false;
  // Heartbeats are per server: one failing replica-set member is not an outage,
  // so each unreachable server is reported by its own address, once.
  const reportedServers = new Set<string>();

  connection.once("connected", () => {
    connected = true;
  });

  connection.getClient().on("serverHeartbeatFailed", (event) => {
    if (connected || reportedServers.has(event.connectionId)) return;
    reportedServers.add(event.connectionId);
    reportStartupFailure(
      `Cannot reach MongoDB server ${event.connectionId}: ${event.failure.message}. ` +
        "Is the database running? Still trying...",
    );
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
    } else if (reportedServers.size === 0) {
      // Failed before any heartbeat ran (SRV/DNS lookup, authentication, ...).
      reportStartupFailure(
        `Cannot connect to MongoDB at ${hosts}: ${error.message}`,
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

/** Options for MongooseModule.forRootAsync, shared by every root connection. */
export function createMongooseOptions(
  configService: ConfigService,
): MongooseModuleFactoryOptions {
  const uri = configService.get<string>("mongodbUri");
  return {
    uri,
    onConnectionCreate: (connection: Connection) =>
      attachMongoConnectionDiagnostics(connection, uri),
    connectionErrorFactory: (error: MongooseError) =>
      toMongoConnectionError(error, uri),
  };
}
