import { EventEmitter } from "events";
import { Logger } from "@nestjs/common";
import { Connection } from "mongoose";
import {
  attachMongoConnectionDiagnostics,
  getMongoHostsForLogging,
} from "./mongo-connection.util";

describe("getMongoHostsForLogging", () => {
  it.each([
    ["mongodb://localhost:27017/scicat", "localhost:27017"],
    ["mongodb://user:p%40ss@db:27017/scicat?authSource=admin", "db:27017"],
    ["mongodb://u:p@h1:27017,h2:27018/db?replicaSet=rs0", "h1:27017,h2:27018"],
    ["mongodb+srv://u:secret@cluster.example.org/db", "cluster.example.org"],
    ["mongodb://localhost", "localhost"],
  ])("%s -> %s", (uri, expected) => {
    expect(getMongoHostsForLogging(uri)).toBe(expected);
  });

  it("handles a missing URI", () => {
    expect(getMongoHostsForLogging(undefined)).toBe("<MONGODB_URI not set>");
  });
});

describe("attachMongoConnectionDiagnostics", () => {
  let connection: EventEmitter & { getClient: () => EventEmitter };
  let client: EventEmitter;
  let errorSpy: jest.SpyInstance;
  let flushSpy: jest.SpyInstance;

  const heartbeatFailed = (connectionId: string, message: string) =>
    client.emit("serverHeartbeatFailed", {
      connectionId,
      failure: new Error(message),
    });

  beforeEach(() => {
    client = new EventEmitter();
    connection = Object.assign(new EventEmitter(), {
      getClient: () => client,
    });
    errorSpy = jest.spyOn(Logger, "error").mockImplementation();
    flushSpy = jest.spyOn(Logger, "flush").mockImplementation();
    attachMongoConnectionDiagnostics(
      connection as unknown as Connection,
      "mongodb://user:secret@h1:27017,h2:27017/db",
    );
  });

  afterEach(() => jest.restoreAllMocks());

  it("reports each unreachable server once, by its own address", () => {
    heartbeatFailed("h1:27017", "refused a");
    heartbeatFailed("h1:27017", "refused a");
    heartbeatFailed("h2:27017", "refused a");

    expect(flushSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledTimes(2);
    expect(errorSpy.mock.calls[0][0]).toContain(
      "Cannot reach MongoDB server h1:27017: refused a",
    );
    expect(errorSpy.mock.calls[1][0]).toContain(
      "Cannot reach MongoDB server h2:27017: refused a",
    );
  });

  it("does not report heartbeat failures after a successful connection", () => {
    connection.emit("connected");
    heartbeatFailed("h1:27017", "refused b");
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it("reports a failure that happens before any heartbeat", () => {
    connection.emit("error", new Error("querySrv ENOTFOUND"));
    expect(flushSpy).toHaveBeenCalled();
    expect(errorSpy).toHaveBeenCalledWith(
      "Cannot connect to MongoDB at h1:27017,h2:27017: querySrv ENOTFOUND",
      "MongoDB",
    );
  });

  it("does not repeat the initial failure after a heartbeat report", () => {
    heartbeatFailed("h1:27017", "refused c");
    connection.emit("error", new Error("server selection timed out"));
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("logs the same report only once across connections", () => {
    const otherClient = new EventEmitter();
    attachMongoConnectionDiagnostics(
      Object.assign(new EventEmitter(), {
        getClient: () => otherClient,
      }) as unknown as Connection,
      "mongodb://h1:27017/db",
    );
    heartbeatFailed("h1:27017", "refused d");
    otherClient.emit("serverHeartbeatFailed", {
      connectionId: "h1:27017",
      failure: new Error("refused d"),
    });
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  it("never logs credentials", () => {
    heartbeatFailed("h1:27017", "refused e");
    connection.emit("error", new Error("boom"));
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain("secret");
  });
});
