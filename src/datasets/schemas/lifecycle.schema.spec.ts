import { model } from "mongoose";
import { LifecycleClass, LifecycleSchema } from "./lifecycle.schema";

const LifecycleModel = model<LifecycleClass>(
  "LifecycleSchemaSpec",
  LifecycleSchema,
);

describe("LifecycleSchema defaults", () => {
  const originalEnv = { ...process.env };

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.useRealTimers();
  });

  it("should shift the publication date by the configured years from today", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 13, 15, 30));
    process.env.POLICY_PUBLICATION_SHIFT = "3";

    const lifecycle = new LifecycleModel();

    expect(lifecycle.dateOfPublishing).toEqual(new Date(2029, 9, 13));
  });

  it("should set the retention date for a non-negative retention shift", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 9, 13, 15, 30));
    process.env.POLICY_RETENTION_SHIFT = "10";

    const lifecycle = new LifecycleModel();

    expect(lifecycle.archiveRetentionTime).toEqual(new Date(2036, 9, 13));
  });

  it("should leave the retention date unset when retention is indefinite", () => {
    process.env.POLICY_RETENTION_SHIFT = "-1";

    const lifecycle = new LifecycleModel();

    expect(lifecycle.archiveRetentionTime).toBeUndefined();
  });

  it("should compute the time-based defaults per document", () => {
    jest.useFakeTimers().setSystemTime(new Date(2026, 0, 1));
    const first = new LifecycleModel();
    jest.setSystemTime(new Date(2026, 5, 1));
    const second = new LifecycleModel();

    expect(first.dateOfDiskPurging).toEqual(new Date(2026, 0, 1));
    expect(second.dateOfDiskPurging).toEqual(new Date(2026, 5, 1));
    expect(first.publishedOn).toEqual(new Date(2026, 0, 1));
    expect(second.publishedOn).toEqual(new Date(2026, 5, 1));
  });

  it("should keep explicitly provided dates", () => {
    const date = new Date(2030, 0, 1);

    const lifecycle = new LifecycleModel({
      dateOfPublishing: date,
      archiveRetentionTime: date,
    });

    expect(lifecycle.dateOfPublishing).toEqual(date);
    expect(lifecycle.archiveRetentionTime).toEqual(date);
  });
});
