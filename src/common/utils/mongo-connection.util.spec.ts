import { getMongoHostsForLogging } from "./mongo-connection.util";

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
