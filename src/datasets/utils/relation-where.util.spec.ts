import {
  findRelationsInWhere,
  refersToRelation,
  splitWhereByRelations,
} from "./relation-where.util";

const relations = ["proposals", "samples"];

describe("refersToRelation", () => {
  it("detects relation field paths", () => {
    expect(refersToRelation({ proposals: { $ne: [] } }, relations)).toBe(true);
    expect(refersToRelation({ "proposals.pi_email": "me" }, relations)).toBe(
      true,
    );
    expect(refersToRelation({ proposalIds: "p1" }, relations)).toBe(false);
  });

  it("detects relations inside logical operators", () => {
    expect(
      refersToRelation(
        { $or: [{ pid: "a" }, { $and: [{ "samples.name": "x" }] }] },
        relations,
      ),
    ).toBe(true);
    expect(refersToRelation({ $nor: [{ pid: "a" }] }, relations)).toBe(false);
  });

  it("detects relation paths in $expr but not variables", () => {
    expect(
      refersToRelation(
        { $expr: { $gt: [{ $size: "$proposals" }, 1] } },
        relations,
      ),
    ).toBe(true);
    expect(
      refersToRelation({ $expr: { $eq: ["$$proposals", 1] } }, relations),
    ).toBe(false);
  });

  it("ignores keys inside a dataset field condition", () => {
    expect(
      refersToRelation(
        { techniques: { $elemMatch: { proposals: "x" } } },
        relations,
      ),
    ).toBe(false);
  });
});

describe("findRelationsInWhere", () => {
  it("returns the relations used", () => {
    expect(
      findRelationsInWhere(
        { pid: "a", $or: [{ "samples.name": "x" }] },
        relations,
      ),
    ).toEqual(["samples"]);
    expect(findRelationsInWhere(undefined, relations)).toEqual([]);
  });
});

describe("splitWhereByRelations", () => {
  it("keeps a where without relations unchanged", () => {
    const where = { pid: "a", $text: { $search: "x" } };
    expect(splitWhereByRelations(where, relations)).toEqual({
      before: where,
      after: {},
    });
    expect(splitWhereByRelations(undefined, relations)).toEqual({
      before: {},
      after: {},
    });
  });

  it("splits top level conditions", () => {
    expect(
      splitWhereByRelations(
        { pid: "a", "proposals.pi_email": "me" },
        relations,
      ),
    ).toEqual({ before: { pid: "a" }, after: { "proposals.pi_email": "me" } });
  });

  it("splits and flattens $and", () => {
    expect(
      splitWhereByRelations(
        {
          $and: [
            { pid: "a" },
            { $and: [{ ownerGroup: "g" }, { proposals: { $ne: [] } }] },
          ],
        },
        relations,
      ),
    ).toEqual({
      before: { $and: [{ pid: "a" }, { ownerGroup: "g" }] },
      after: { proposals: { $ne: [] } },
    });
  });

  it("moves an $or referring to a relation after as a whole", () => {
    const or = { $or: [{ pid: "a" }, { "proposals.pi_email": "me" }] };
    expect(
      splitWhereByRelations({ ownerGroup: "g", ...or }, relations),
    ).toEqual({ before: { ownerGroup: "g" }, after: or });
  });

  it("moves an $or inside $and after as a whole", () => {
    const or = { $or: [{ pid: "b" }, { "proposals.pi_email": "me" }] };
    expect(
      splitWhereByRelations({ $and: [{ pid: "a" }, or] }, relations),
    ).toEqual({ before: { pid: "a" }, after: or });
  });

  it("moves an $or containing an $and with a relation after entirely", () => {
    const where = {
      $or: [
        { $and: [{ pid: "a" }, { "proposals.pi_email": "me" }] },
        { ownerGroup: "g" },
      ],
    };
    expect(splitWhereByRelations(where, relations)).toEqual({
      before: {},
      after: where,
    });
  });

  it("keeps an $or without relations before", () => {
    const where = {
      $or: [{ pid: "a" }, { pid: "b" }],
      "samples.name": "x",
    };
    expect(splitWhereByRelations(where, relations)).toEqual({
      before: { $or: [{ pid: "a" }, { pid: "b" }] },
      after: { "samples.name": "x" },
    });
  });
});
