import { getCurrentSession, runWithSession } from "./session-context.util";

describe("session-context.util", () => {
  it("returns undefined outside any session scope", () => {
    expect(getCurrentSession()).toBeUndefined();
  });

  it("makes the session available inside runWithSession", async () => {
    const session = { id: "s1" } as unknown as import("mongoose").ClientSession;

    const seenInside = await runWithSession(session, async () => {
      return getCurrentSession();
    });

    expect(seenInside).toBe(session);
  });

  it("propagates the session across awaits within the scope", async () => {
    const session = { id: "s2" } as unknown as import("mongoose").ClientSession;

    const seen = await runWithSession(session, async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
      return getCurrentSession();
    });

    expect(seen).toBe(session);
  });

  it("propagates the session into concurrent branches started inside the scope", async () => {
    const session = { id: "s3" } as unknown as import("mongoose").ClientSession;

    const [a, b] = await runWithSession(session, () =>
      Promise.all([
        (async () => {
          await new Promise((resolve) => setTimeout(resolve, 0));
          return getCurrentSession();
        })(),
        (async () => getCurrentSession())(),
      ]),
    );

    expect(a).toBe(session);
    expect(b).toBe(session);
  });

  it("does not leak the session after runWithSession resolves", async () => {
    const session = { id: "s4" } as unknown as import("mongoose").ClientSession;

    await runWithSession(session, async () => getCurrentSession());

    expect(getCurrentSession()).toBeUndefined();
  });

  it("does not leak the session to code that runs concurrently but outside the scope", async () => {
    const session = { id: "s5" } as unknown as import("mongoose").ClientSession;

    const outsidePromise = new Promise((resolve) =>
      setTimeout(() => resolve(getCurrentSession()), 0),
    );

    await runWithSession(session, async () => {
      await new Promise((resolve) => setTimeout(resolve, 5));
    });

    expect(await outsidePromise).toBeUndefined();
  });
});
