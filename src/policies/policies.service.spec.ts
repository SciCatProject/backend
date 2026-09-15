import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "src/users/users.service";
import { PoliciesService } from "./policies.service";
import { Policy, PolicyDocument } from "./schemas/policy.schema";

class UsersServiceMock {}

function makePolicy(overrides: Record<string, unknown>): PolicyDocument {
  const policy = {
    _id: "id",
    ownerGroup: "group1",
    accessGroups: [],
    isPublished: false,
    manager: [],
    ...overrides,
  };
  return {
    ...policy,
    toObject: () => ({ _id: policy._id, ownerGroup: policy.ownerGroup }),
  } as unknown as PolicyDocument;
}

function execResolving<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

describe("PoliciesService", () => {
  let service: PoliciesService;
  let policyModel: {
    findOne: jest.Mock;
    find: jest.Mock;
    findOneAndUpdate: jest.Mock;
    deleteMany: jest.Mock;
    aggregate: jest.Mock;
    countDocuments: jest.Mock;
    distinct: jest.Mock;
    hydrate: jest.Mock;
  };

  beforeEach(async () => {
    policyModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      findOneAndUpdate: jest.fn(),
      deleteMany: jest.fn(),
      aggregate: jest.fn(),
      countDocuments: jest.fn().mockReturnValue(execResolving(0)),
      distinct: jest.fn().mockReturnValue(execResolving([])),
      hydrate: jest.fn((doc: Record<string, unknown>) => makePolicy(doc)),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        PoliciesService,
        { provide: UsersService, useClass: UsersServiceMock },
        { provide: REQUEST, useValue: { user: { username: "tester" } } },
        { provide: getModelToken(Policy.name), useValue: policyModel },
      ],
    }).compile();

    service = await module.resolve<PoliciesService>(PoliciesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("update", () => {
    it("0100: upserts the touched type(s) instead of silently no-op'ing when a sibling document is missing", async () => {
      policyModel.findOne.mockReturnValue(
        execResolving(makePolicy({ _id: "archiveId", type: "archive" })),
      );
      policyModel.aggregate.mockReturnValue(
        execResolving([
          {
            _id: "group1",
            docs: [{ _id: "archiveId", ownerGroup: "group1", type: "archive" }],
          },
        ]),
      );
      const findOneAndUpdate = jest
        .fn()
        .mockReturnValue(execResolving(makePolicy({ type: "retrieve" })));
      policyModel.findOneAndUpdate = findOneAndUpdate;

      await service.update("archiveId", { retrieveEmailNotification: true });

      expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
      const [filter, , options] = findOneAndUpdate.mock.calls[0];
      expect(filter).toMatchObject({ ownerGroup: "group1", type: "retrieve" });
      expect(options.upsert).toBe(true);
    });

    it("0110: only updates the type(s) actually touched by the patch body", async () => {
      policyModel.findOne.mockReturnValue(
        execResolving(makePolicy({ _id: "archiveId", type: "archive" })),
      );
      policyModel.aggregate.mockReturnValue(
        execResolving([
          {
            _id: "group1",
            docs: [{ _id: "archiveId", ownerGroup: "group1", type: "archive" }],
          },
        ]),
      );
      const findOneAndUpdate = jest
        .fn()
        .mockReturnValue(execResolving(makePolicy({ type: "archive" })));
      policyModel.findOneAndUpdate = findOneAndUpdate;

      await service.update("archiveId", { tapeRedundancy: "high" });

      expect(findOneAndUpdate).toHaveBeenCalledTimes(1);
      const [filter] = findOneAndUpdate.mock.calls[0];
      expect(filter).toMatchObject({ ownerGroup: "group1", type: "archive" });
    });

    it("0120: returns null when the id doesn't resolve to any document", async () => {
      policyModel.findOne.mockReturnValue(execResolving(null));
      const findOneAndUpdate = jest.fn();
      policyModel.findOneAndUpdate = findOneAndUpdate;

      const result = await service.update("missing", {
        tapeRedundancy: "high",
      });

      expect(result).toBeNull();
      expect(findOneAndUpdate).not.toHaveBeenCalled();
    });

    it("0130: excludes superseded documents from the persisted filter", async () => {
      policyModel.findOne.mockReturnValue(
        execResolving(makePolicy({ _id: "archiveId", type: "archive" })),
      );
      policyModel.aggregate.mockReturnValue(
        execResolving([
          {
            _id: "group1",
            docs: [{ _id: "archiveId", ownerGroup: "group1", type: "archive" }],
          },
        ]),
      );
      const findOneAndUpdate = jest
        .fn()
        .mockReturnValue(execResolving(makePolicy({ type: "archive" })));
      policyModel.findOneAndUpdate = findOneAndUpdate;

      await service.update("archiveId", { tapeRedundancy: "high" });

      const [filter] = findOneAndUpdate.mock.calls[0];
      expect(filter).toMatchObject({ supersededBy: { $exists: false } });
    });

    it("0140: sets $setOnInsert(createdBy) alongside the upsert", async () => {
      policyModel.findOne.mockReturnValue(
        execResolving(makePolicy({ _id: "archiveId", type: "archive" })),
      );
      policyModel.aggregate.mockReturnValue(
        execResolving([
          {
            _id: "group1",
            docs: [{ _id: "archiveId", ownerGroup: "group1", type: "archive" }],
          },
        ]),
      );
      const findOneAndUpdate = jest
        .fn()
        .mockReturnValue(execResolving(makePolicy({ type: "archive" })));
      policyModel.findOneAndUpdate = findOneAndUpdate;

      await service.update("archiveId", { tapeRedundancy: "high" });

      const [, updateDoc, options] = findOneAndUpdate.mock.calls[0];
      expect(options.setDefaultsOnInsert).toBe(true);
      expect(updateDoc.$setOnInsert).toHaveProperty("createdBy");
    });

    it("0150: retries as a plain update when a concurrent upsert races past the unique index", async () => {
      policyModel.findOne.mockReturnValue(
        execResolving(makePolicy({ _id: "archiveId", type: "archive" })),
      );
      policyModel.aggregate.mockReturnValue(
        execResolving([
          {
            _id: "group1",
            docs: [{ _id: "archiveId", ownerGroup: "group1", type: "archive" }],
          },
        ]),
      );
      const raceError = Object.assign(new Error("duplicate key"), {
        code: 11000,
      });
      const failingExec = jest.fn().mockRejectedValue(raceError);
      const retryExec = jest
        .fn()
        .mockResolvedValue(makePolicy({ type: "archive" }));
      const findOneAndUpdate = jest
        .fn()
        .mockReturnValueOnce({ exec: failingExec })
        .mockReturnValueOnce({ exec: retryExec });
      policyModel.findOneAndUpdate = findOneAndUpdate;

      await service.update("archiveId", { tapeRedundancy: "high" });

      expect(findOneAndUpdate).toHaveBeenCalledTimes(2);
      const [, , retryOptions] = findOneAndUpdate.mock.calls[1];
      expect(retryOptions.upsert).toBeUndefined();
    });
  });

  describe("remove", () => {
    it("0400: only deletes live documents, leaving supersededBy history intact", async () => {
      policyModel.findOne.mockReturnValue(
        execResolving(makePolicy({ _id: "archiveId", type: "archive" })),
      );
      const deleteMany = jest
        .fn()
        .mockReturnValue(execResolving({ deletedCount: 2 }));
      policyModel.deleteMany = deleteMany;

      await service.remove("archiveId");

      expect(deleteMany).toHaveBeenCalledWith({
        ownerGroup: "group1",
        supersededBy: { $exists: false },
      });
    });

    it("0410: returns null when the id doesn't resolve to any document", async () => {
      policyModel.findOne.mockReturnValue(execResolving(null));
      const deleteMany = jest.fn();
      policyModel.deleteMany = deleteMany;

      const result = await service.remove("missing");

      expect(result).toBeNull();
      expect(deleteMany).not.toHaveBeenCalled();
    });
  });

  describe("findAll", () => {
    it("0200: groups each page's documents by ownerGroup in a single aggregation", async () => {
      policyModel.aggregate.mockReturnValue(
        execResolving([
          {
            _id: "group2",
            docs: [
              { _id: "g2a", ownerGroup: "group2", type: "archive" },
              { _id: "g2r", ownerGroup: "group2", type: "retrieve" },
            ],
          },
          {
            _id: "group1",
            docs: [{ _id: "g1a", ownerGroup: "group1", type: "archive" }],
          },
        ]),
      );

      const result = await service.findAll({
        limits: { limit: 2, skip: 0, order: "ownerGroup:desc" },
      });

      // preserves the order the aggregation already sorted groups in.
      expect(result.map((policy) => policy.ownerGroup)).toEqual([
        "group2",
        "group1",
      ]);
    });

    it("0210: rehydrates each pushed document before merging (plain BSON objects don't have toObject)", async () => {
      policyModel.aggregate.mockReturnValue(
        execResolving([
          {
            _id: "group1",
            docs: [{ _id: "g1a", ownerGroup: "group1", type: "archive" }],
          },
        ]),
      );

      await service.findAll({});

      expect(policyModel.hydrate).toHaveBeenCalledWith({
        _id: "g1a",
        ownerGroup: "group1",
        type: "archive",
      });
    });

    it("0220: applies the live filter and requested pagination/sort as pipeline stages", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([]));

      await service.findAll({
        limits: { limit: 5, skip: 10, order: "ownerGroup:desc" },
      });

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      expect(pipeline[0]).toEqual({
        $match: { supersededBy: { $exists: false } },
      });
      expect(pipeline[1]).toMatchObject({ $group: { _id: "$ownerGroup" } });
      expect(pipeline[3]).toEqual({ $sort: { sortValue: -1 } });
      expect(pipeline).toContainEqual({ $skip: 10 });
      expect(pipeline).toContainEqual({ $limit: 5 });
    });

    it("0230: drops ownerGroups with no archive/retrieve document before pagination, not after", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([]));

      await service.findAll({
        limits: { limit: 5, skip: 10, order: "ownerGroup:asc" },
      });

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      const typeMatchIndex = pipeline.findIndex(
        (stage: Record<string, unknown>) =>
          "$match" in stage &&
          "docs.type" in (stage.$match as Record<string, unknown>),
      );
      const skipIndex = pipeline.findIndex(
        (stage: Record<string, unknown>) => "$skip" in stage,
      );
      expect(pipeline[typeMatchIndex]).toEqual({
        $match: { "docs.type": { $in: ["archive", "retrieve"] } },
      });
      expect(typeMatchIndex).toBeGreaterThanOrEqual(0);
      expect(typeMatchIndex).toBeLessThan(skipIndex);
    });
  });

  describe("count", () => {
    it("0300: counts true distinct ownerGroups via Model.distinct, excluding superseded documents", async () => {
      const distinct = jest
        .fn()
        .mockReturnValue(execResolving(["group1", "group2", "group3"]));
      policyModel.distinct = distinct;

      const result = await service.count({});

      expect(distinct).toHaveBeenCalledWith(
        "ownerGroup",
        expect.objectContaining({ supersededBy: { $exists: false } }),
      );
      expect(result).toEqual({ count: 3 });
    });
  });
});
