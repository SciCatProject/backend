import { Schema } from "mongoose";
import { attachAmbientSession, sessionPlugin } from "./session.plugin";
import { runWithSession } from "../../utils/session-context.util";

describe("attachAmbientSession", () => {
  const fakeSession = { id: "s1" } as never;

  it("does nothing outside of a transaction", () => {
    const query = {
      session: jest.fn(),
      getOptions: jest.fn().mockReturnValue({}),
    };

    attachAmbientSession(query);

    expect(query.session).not.toHaveBeenCalled();
  });

  it("attaches the ambient session to a query with no session of its own", async () => {
    const query = {
      session: jest.fn(),
      getOptions: jest.fn().mockReturnValue({}),
    };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(query);
    });

    expect(query.session).toHaveBeenCalledWith(fakeSession);
  });

  it("does not override a query that already has its own session", async () => {
    const ownSession = { id: "own" } as never;
    const query = {
      session: jest.fn(),
      getOptions: jest.fn().mockReturnValue({ session: ownSession }),
    };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(query);
    });

    expect(query.session).not.toHaveBeenCalled();
  });

  it("does not override a query explicitly opted out of any session with session: null", async () => {
    const query = {
      session: jest.fn(),
      getOptions: jest.fn().mockReturnValue({ session: null }),
    };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(query);
    });

    expect(query.session).not.toHaveBeenCalled();
  });

  it("attaches the ambient session to an aggregate with no session of its own", async () => {
    const aggregate = { session: jest.fn(), options: {} };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(aggregate);
    });

    expect(aggregate.session).toHaveBeenCalledWith(fakeSession);
  });

  it("does not override an aggregate that already has its own session", async () => {
    const ownSession = { id: "own" } as never;
    const aggregate = { session: jest.fn(), options: { session: ownSession } };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(aggregate);
    });

    expect(aggregate.session).not.toHaveBeenCalled();
  });

  it("does not override an aggregate explicitly opted out of any session with session: null", async () => {
    const aggregate = { session: jest.fn(), options: { session: null } };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(aggregate);
    });

    expect(aggregate.session).not.toHaveBeenCalled();
  });

  it("attaches the ambient session to a document with no session of its own", async () => {
    const doc = { $session: jest.fn().mockReturnValue(undefined) };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(doc);
    });

    expect(doc.$session).toHaveBeenCalledWith(fakeSession);
  });

  it("does not override a document that already has its own session", async () => {
    const ownSession = { id: "own" };
    const doc = { $session: jest.fn().mockReturnValue(ownSession) };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(doc);
    });

    expect(doc.$session).toHaveBeenCalledTimes(1);
  });

  it("does not override a document explicitly opted out of any session with $session(null)", async () => {
    const doc = { $session: jest.fn().mockReturnValue(null) };

    await runWithSession(fakeSession, async () => {
      attachAmbientSession(doc);
    });

    expect(doc.$session).toHaveBeenCalledTimes(1);
  });
});

describe("sessionPlugin", () => {
  it("registers pre-hooks for queries, aggregate, and save", () => {
    const schema = new Schema({ name: String });
    const preSpy = jest.spyOn(schema, "pre");

    sessionPlugin(schema);

    const registeredOps = preSpy.mock.calls.flatMap((call) => call[0]);
    expect(registeredOps).toEqual(
      expect.arrayContaining([
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
        "aggregate",
        "save",
      ]),
    );
  });
});
