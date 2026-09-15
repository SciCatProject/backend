import mongoose from "mongoose";
import { Policy, PolicySchema, PolicyDocument } from "../schemas/policy.schema";
import {
  findUniqueByType,
  mergeArchiveRetrieveToLegacyDto,
} from "./policy-legacy-shape.util";

const PolicyModel = mongoose.model<Policy>(
  "PolicyLegacyShapeSpec",
  PolicySchema,
);

function makeDoc(overrides: Partial<Policy>): PolicyDocument {
  return new PolicyModel({
    _id: "id",
    ownerGroup: "group1",
    accessGroups: [],
    isPublished: false,
    manager: [],
    ...overrides,
  }) as unknown as PolicyDocument;
}

describe("mergeArchiveRetrieveToLegacyDto", () => {
  it("0100: preserves _id/id/ownerGroup and the real archive fields when only archive exists", () => {
    const archive = makeDoc({
      _id: "archive-id",
      type: "archive",
      manager: ["alice@example.com"],
      emailTo: ["archive@example.com"],
      emailNotification: true,
      policyParams: { tapeRedundancy: "high" },
    });

    const merged = mergeArchiveRetrieveToLegacyDto(archive, undefined);

    expect(merged).toMatchObject({
      _id: "archive-id",
      id: "archive-id",
      ownerGroup: "group1",
      manager: ["alice@example.com"],
      archiveEmailNotification: true,
      archiveEmailsToBeNotified: ["archive@example.com"],
      tapeRedundancy: "high",
    });
  });

  it("0110: falls back to documented v3 defaults for the missing retrieve side", () => {
    const archive = makeDoc({ type: "archive" });

    const merged = mergeArchiveRetrieveToLegacyDto(archive, undefined);

    expect(merged).toMatchObject({
      retrieveEmailNotification: false,
      retrieveEmailsToBeNotified: [],
    });
  });

  it("0120: falls back to documented v3 defaults for the missing archive side", () => {
    const retrieve = makeDoc({
      type: "retrieve",
      emailTo: ["retrieve@example.com"],
      emailNotification: true,
    });

    const merged = mergeArchiveRetrieveToLegacyDto(undefined, retrieve);

    expect(merged).toMatchObject({
      archiveEmailNotification: false,
      archiveEmailsToBeNotified: [],
      tapeRedundancy: "low",
      autoArchive: true,
      autoArchiveDelay: 7,
      embargoPeriod: 3,
      retrieveEmailNotification: true,
      retrieveEmailsToBeNotified: ["retrieve@example.com"],
    });
  });

  it("0130: returns null when neither document exists", () => {
    expect(mergeArchiveRetrieveToLegacyDto(undefined, undefined)).toBeNull();
  });

  it("0140: unions manager across both documents", () => {
    const archive = makeDoc({ type: "archive", manager: ["a@example.com"] });
    const retrieve = makeDoc({
      type: "retrieve",
      manager: ["a@example.com", "b@example.com"],
    });

    const merged = mergeArchiveRetrieveToLegacyDto(archive, retrieve);

    expect(merged?.manager).toEqual(
      expect.arrayContaining(["a@example.com", "b@example.com"]),
    );
    expect((merged?.manager as string[]).length).toBe(2);
  });
});

describe("findUniqueByType", () => {
  it("0200: returns the single matching document", () => {
    const archive = makeDoc({ _id: "a", type: "archive" });
    const retrieve = makeDoc({ _id: "r", type: "retrieve" });

    expect(findUniqueByType([archive, retrieve], "archive")).toBe(archive);
  });

  it("0210: returns undefined when there is no match", () => {
    const archive = makeDoc({ _id: "a", type: "archive" });

    expect(findUniqueByType([archive], "retrieve")).toBeUndefined();
  });

  it("0220: throws when more than one document of the same type exists", () => {
    const first = makeDoc({ _id: "a1", type: "archive" });
    const second = makeDoc({ _id: "a2", type: "archive" });

    expect(() => findUniqueByType([first, second], "archive")).toThrow(
      /Data integrity error/,
    );
  });
});
