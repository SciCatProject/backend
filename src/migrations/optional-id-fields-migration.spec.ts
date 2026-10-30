import migration from "../../migrations/20261005113000-add-optional-id-fields-to-published-data";

describe("add optional ID fields to PublishedData migration", () => {
  it("completes rollback as a no-op without accessing a database result", async () => {
    const db = {
      collection: jest.fn(),
    };
    const logSpy = jest
      .spyOn(console, "log")
      .mockImplementation(() => undefined);

    try {
      await expect(migration.down(db)).resolves.toEqual({ modifiedCount: 0 });
      expect(db.collection).not.toHaveBeenCalled();
    } finally {
      logSpy.mockRestore();
    }
  });
});
