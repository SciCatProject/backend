import {
  ConflictException,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { REQUEST } from "@nestjs/core";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "src/users/users.service";
import { PoliciesService } from "./policies.service";
import { Policy, PolicyDocument } from "./schemas/policy.schema";

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
    toObject: () => ({ ...policy }),
  } as unknown as PolicyDocument;
}

function execResolving<T>(value: T) {
  return { exec: jest.fn().mockResolvedValue(value) };
}

type PolicyModelMock = jest.Mock & {
  findOne: jest.Mock;
  find: jest.Mock;
  findOneAndUpdate: jest.Mock;
  deleteMany: jest.Mock;
  deleteOne: jest.Mock;
  replaceOne: jest.Mock;
  aggregate: jest.Mock;
  countDocuments: jest.Mock;
  distinct: jest.Mock;
  hydrate: jest.Mock;
};

// Doubles as `this.policyModel.xyz(...)` (query methods) and as
// `new this.policyModel(dto)` (persistNew), mirroring how
// PoliciesV4Service's spec mocks the same model. `.save()` resolves to the
// constructed instance itself, like a real Mongoose document would.
function makePolicyModelMock(): PolicyModelMock {
  const modelFn = jest.fn().mockImplementation(function (
    this: Record<string, unknown> & {
      save?: jest.Mock;
      toObject?: jest.Mock;
    },
    dto: Record<string, unknown>,
  ) {
    Object.assign(this, dto);
    this.toObject = jest.fn().mockReturnValue({ ...dto });
    this.save = jest.fn().mockResolvedValue(this);
  }) as PolicyModelMock;
  modelFn.findOne = jest.fn();
  modelFn.find = jest.fn();
  modelFn.findOneAndUpdate = jest.fn();
  modelFn.deleteMany = jest.fn();
  modelFn.deleteOne = jest.fn().mockReturnValue(execResolving({}));
  modelFn.replaceOne = jest.fn().mockReturnValue(execResolving({}));
  modelFn.aggregate = jest.fn();
  modelFn.countDocuments = jest.fn().mockReturnValue(execResolving(0));
  modelFn.distinct = jest.fn().mockReturnValue(execResolving([]));
  modelFn.hydrate = jest.fn((doc: Record<string, unknown>) => makePolicy(doc));
  return modelFn;
}

describe("PoliciesService", () => {
  let service: PoliciesService;
  let policyModel: PolicyModelMock;
  let usersServiceMock: {
    findByIdUserIdentity: jest.Mock;
    findById: jest.Mock;
  };

  beforeEach(async () => {
    policyModel = makePolicyModelMock();
    usersServiceMock = {
      findByIdUserIdentity: jest.fn().mockResolvedValue(null),
      findById: jest
        .fn()
        .mockResolvedValue({ _id: "user1", email: "user1@example.com" }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        PoliciesService,
        { provide: UsersService, useValue: usersServiceMock },
        {
          provide: REQUEST,
          useValue: { user: { _id: "user1", username: "tester" } },
        },
        { provide: getModelToken(Policy.name), useValue: policyModel },
      ],
    }).compile();

    service = await module.resolve<PoliciesService>(PoliciesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("onModuleInit", () => {
    it("0000: warns when Policy documents exist that haven't been split into archive/retrieve yet", async () => {
      const warn = jest.spyOn(Logger, "warn").mockImplementation();
      policyModel.countDocuments.mockImplementation(
        (filter: Record<string, unknown>) =>
          execResolving("type" in filter ? 3 : 0),
      );

      await service.onModuleInit();

      expect(
        warn.mock.calls.some(([message]) =>
          String(message).includes("haven't been"),
        ),
      ).toBe(true);
      warn.mockRestore();
    });

    it("0010: doesn't warn when every Policy document has already been split", async () => {
      const warn = jest.spyOn(Logger, "warn").mockImplementation();
      policyModel.countDocuments.mockReturnValue(execResolving(0));

      await service.onModuleInit();

      expect(
        warn.mock.calls.some(([message]) =>
          String(message).includes("haven't been"),
        ),
      ).toBe(false);
      warn.mockRestore();
    });
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

    it("0160: restores the archive side to its pre-update snapshot when the retrieve upsert fails", async () => {
      const previousArchive = makePolicy({
        _id: "archiveId",
        type: "archive",
        manager: ["mgr@example.com"],
      });
      policyModel.findOne.mockReturnValue(execResolving(previousArchive));
      policyModel.findOneAndUpdate = jest
        .fn()
        .mockReturnValueOnce(
          execResolving(makePolicy({ type: "archive", _id: "archiveId" })),
        )
        .mockReturnValueOnce({
          exec: jest.fn().mockRejectedValue(new Error("boom")),
        });

      await expect(
        service.update("archiveId", {
          tapeRedundancy: "high",
          retrieveEmailNotification: true,
        }),
      ).rejects.toThrow("boom");

      expect(policyModel.replaceOne).toHaveBeenCalledWith(
        { _id: "archiveId" },
        expect.objectContaining({ manager: ["mgr@example.com"] }),
      );
      expect(policyModel.deleteOne).not.toHaveBeenCalled();
    });

    it("0170: rolls back by _id, not the now-stale ownerGroup, when the patch itself renamed ownerGroup", async () => {
      const previousArchive = makePolicy({
        _id: "archiveId",
        type: "archive",
        ownerGroup: "oldGroup",
        manager: ["mgr@example.com"],
      });
      policyModel.findOne.mockReturnValue(execResolving(previousArchive));
      policyModel.findOneAndUpdate = jest
        .fn()
        .mockReturnValueOnce(
          execResolving(
            makePolicy({
              _id: "archiveId",
              type: "archive",
              ownerGroup: "newGroup",
            }),
          ),
        )
        .mockReturnValueOnce({
          exec: jest.fn().mockRejectedValue(new Error("boom")),
        });

      await expect(
        service.update("archiveId", {
          ownerGroup: "newGroup",
          retrieveEmailNotification: true,
        }),
      ).rejects.toThrow("boom");

      // Not {ownerGroup: "oldGroup", ...} (stale - the archive doc no
      // longer has that ownerGroup) nor {ownerGroup: "newGroup", ...}
      // (ambiguous/coincidental) - only _id reliably identifies the
      // document that was actually just renamed.
      expect(policyModel.replaceOne).toHaveBeenCalledWith(
        { _id: "archiveId" },
        expect.objectContaining({ manager: ["mgr@example.com"] }),
      );
    });

    it("0180: maps a second, permanent E11000 on the plain-update retry to a ConflictException, instead of letting it propagate raw", async () => {
      policyModel.findOne.mockReturnValue(
        execResolving(makePolicy({ _id: "archiveId", type: "archive" })),
      );
      const raceError = Object.assign(new Error("duplicate key"), {
        code: 11000,
      });
      policyModel.findOneAndUpdate = jest
        .fn()
        .mockReturnValueOnce({
          exec: jest.fn().mockRejectedValue(raceError),
        })
        .mockReturnValueOnce({
          exec: jest.fn().mockRejectedValue(raceError),
        });

      await expect(
        service.update("archiveId", { tapeRedundancy: "high" }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("remove", () => {
    it("0400: only deletes live documents, leaving supersededBy history intact", async () => {
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

    it("0405: returns the deleted policy's merged representation, not the raw deleteMany result", async () => {
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
      policyModel.deleteMany = jest
        .fn()
        .mockReturnValue(
          execResolving({ acknowledged: true, deletedCount: 2 }),
        );

      const result = await service.remove("archiveId");

      expect(result).toMatchObject({ ownerGroup: "group1" });
      expect(result).not.toHaveProperty("deletedCount");
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
      expect(pipeline).toContainEqual({ $sort: { sortValue: -1 } });
      expect(pipeline).toContainEqual({ $skip: 10 });
      expect(pipeline).toContainEqual({ $limit: 5 });
    });

    it("0225: computes the group sort value from the merged document after grouping, not via $first before sorting", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([]));

      await service.findAll({
        limits: { order: "updatedAt:asc" },
      });

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      const groupStage = pipeline.find(
        (stage: Record<string, unknown>) => "$group" in stage,
      );
      expect(groupStage.$group).not.toHaveProperty("sortValue");

      const sortValueStage = pipeline.find(
        (stage: Record<string, unknown>) =>
          "$addFields" in stage &&
          "sortValue" in (stage.$addFields as Record<string, unknown>),
      );
      expect(sortValueStage.$addFields.sortValue).toBe("$merged.updatedAt");

      const sortValueIndex = pipeline.indexOf(sortValueStage);
      const sortIndex = pipeline.findIndex(
        (stage: Record<string, unknown>) => "$sort" in stage,
      );
      expect(sortValueIndex).toBeLessThan(sortIndex);
    });

    it("0226: evaluates the filter against the merged representation, so archive- and retrieve-only fields can be combined", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([]));

      await service.findAll({
        where: {
          "policyParams.tapeRedundancy": "low",
          emailNotification: true,
        },
      });

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      const whereMatchStage = pipeline.find(
        (stage: Record<string, unknown>) =>
          "$match" in stage &&
          "merged.policyParams.tapeRedundancy" in
            (stage.$match as Record<string, unknown>),
      );
      expect(whereMatchStage.$match).toEqual({
        "merged.policyParams.tapeRedundancy": "low",
        "merged.emailNotification": true,
      });
    });

    it("0227: routes archiveEmailNotification/retrieveEmailNotification to their own per-type document, not the merged one", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([]));

      // V3_WHERE_PIPE leaves these two field names untranslated (see
      // AMBIGUOUS_TYPE_FIELD_MAP), so this is what actually reaches the
      // service - not "emailNotification" for both.
      await service.findAll({
        where: {
          archiveEmailNotification: true,
          retrieveEmailNotification: false,
        } as never,
      });

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      const whereMatchStage = pipeline.find(
        (stage: Record<string, unknown>) =>
          "$match" in stage &&
          "archiveDoc.emailNotification" in
            (stage.$match as Record<string, unknown>),
      );
      expect(whereMatchStage.$match).toEqual({
        "archiveDoc.emailNotification": true,
        "retrieveDoc.emailNotification": false,
      });
    });

    it("0228: sorts by the archive side's own document when the sort field is ambiguous", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([]));

      await service.findAll({
        limits: { order: "archiveEmailNotification:asc" },
      });

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      const sortValueStage = pipeline.find(
        (stage: Record<string, unknown>) =>
          "$addFields" in stage &&
          "sortValue" in (stage.$addFields as Record<string, unknown>),
      );
      expect(sortValueStage.$addFields.sortValue).toBe(
        "$archiveDoc.emailNotification",
      );
    });

    it("0229: merges manager as a union of both documents, not last-write-wins, matching mergeArchiveRetrieveToLegacyDto", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([]));

      await service.findAll({});

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      const mergedStage = pipeline.find(
        (stage: Record<string, unknown>) =>
          "$addFields" in stage &&
          "merged" in (stage.$addFields as Record<string, unknown>),
      );
      const mergeExpr = mergedStage.$addFields.merged.$mergeObjects;
      // archiveDoc must come after retrieveDoc so it takes precedence on a
      // conflicting field, matching mergeArchiveRetrieveToLegacyDto's
      // "representative = archiveDoc ?? retrieveDoc".
      expect(mergeExpr[0]).toBe("$retrieveDoc");
      expect(mergeExpr[1]).toBe("$archiveDoc");
      // manager itself is explicitly overridden with a union of both sides.
      expect(mergeExpr[2].manager.$setUnion).toEqual([
        { $ifNull: ["$archiveDoc.manager", []] },
        { $ifNull: ["$retrieveDoc.manager", []] },
      ]);
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
    it("0300: counts distinct ownerGroups via the merged owner-group aggregation, excluding superseded documents", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([{ count: 3 }]));

      const result = await service.count({});

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      expect(pipeline[0]).toEqual({
        $match: { supersededBy: { $exists: false } },
      });
      expect(pipeline).toContainEqual({ $count: "count" });
      expect(result).toEqual({ count: 3 });
    });

    it("0310: returns 0 when no owner group matches", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([]));

      const result = await service.count({ ownerGroup: "missing" });

      expect(result).toEqual({ count: 0 });
    });

    it("0320: evaluates the filter against the merged representation, so archive- and retrieve-only fields can be combined", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([{ count: 1 }]));

      await service.count({
        "policyParams.tapeRedundancy": "low",
        emailNotification: true,
      });

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      const whereMatchStage = pipeline.find(
        (stage: Record<string, unknown>) =>
          "$match" in stage &&
          "merged.policyParams.tapeRedundancy" in
            (stage.$match as Record<string, unknown>),
      );
      expect(whereMatchStage.$match).toEqual({
        "merged.policyParams.tapeRedundancy": "low",
        "merged.emailNotification": true,
      });
    });

    it("0330: routes archiveEmailNotification/retrieveEmailNotification to their own per-type document, not the merged one", async () => {
      policyModel.aggregate.mockReturnValue(execResolving([{ count: 1 }]));

      await service.count({
        archiveEmailNotification: true,
        retrieveEmailNotification: false,
      } as never);

      const [pipeline] = policyModel.aggregate.mock.calls[0];
      const whereMatchStage = pipeline.find(
        (stage: Record<string, unknown>) =>
          "$match" in stage &&
          "archiveDoc.emailNotification" in
            (stage.$match as Record<string, unknown>),
      );
      expect(whereMatchStage.$match).toEqual({
        "archiveDoc.emailNotification": true,
        "retrieveDoc.emailNotification": false,
      });
    });
  });

  describe("create", () => {
    it("0500: deletes the archive side if the retrieve save fails after it", async () => {
      let call = 0;
      policyModel.mockImplementation(function (
        this: Record<string, unknown> & { save?: jest.Mock },
        dto: Record<string, unknown>,
      ) {
        call += 1;
        Object.assign(this, dto);
        this.save =
          call === 1
            ? jest.fn().mockResolvedValue({ ...dto, _id: "archiveId" })
            : jest.fn().mockRejectedValue(new Error("boom"));
      });

      await expect(
        service.create({ ownerGroup: "group1" } as never),
      ).rejects.toThrow("boom");

      expect(policyModel.deleteOne).toHaveBeenCalledWith({
        _id: "archiveId",
      });
    });

    it("0510: doesn't delete anything when both saves succeed", async () => {
      await service.create({ ownerGroup: "group1" } as never);

      expect(policyModel.deleteOne).not.toHaveBeenCalled();
    });
  });

  describe("addDefaultPolicy", () => {
    it("0700: no-ops when a policy already exists for the ownerGroup", async () => {
      policyModel.findOne.mockReturnValue(
        execResolving(makePolicy({ ownerGroup: "group1" })),
      );

      await service.addDefaultPolicy("group1", [], "owner@example.com", "low");

      expect(policyModel).not.toHaveBeenCalled();
    });

    it("0710: deletes the archive side if the retrieve save fails after it, same as create()", async () => {
      policyModel.findOne.mockReturnValue(execResolving(null));
      let call = 0;
      policyModel.mockImplementation(function (
        this: Record<string, unknown> & { save?: jest.Mock },
        dto: Record<string, unknown>,
      ) {
        call += 1;
        Object.assign(this, dto);
        this.save =
          call === 1
            ? jest.fn().mockResolvedValue({ ...dto, _id: "archiveId" })
            : jest.fn().mockRejectedValue(new Error("boom"));
      });

      await expect(
        service.addDefaultPolicy("group1", [], "owner@example.com", "low"),
      ).rejects.toThrow(InternalServerErrorException);

      expect(policyModel.deleteOne).toHaveBeenCalledWith({
        _id: "archiveId",
      });
    });
  });

  describe("updateWhere", () => {
    function mockAddDefaultPolicyNoOp() {
      // addDefaultPolicy's coarse existence check (no `type` in the
      // filter) - resolve truthy so it no-ops rather than trying to
      // bootstrap a default policy; these tests aren't exercising that
      // path.
      policyModel.findOne.mockImplementation(
        (filter: Record<string, unknown>) =>
          execResolving(
            "type" in filter ? null : makePolicy({ ownerGroup: "group1" }),
          ),
      );
    }

    it("0600: restores the archive side to its pre-update snapshot when the retrieve upsert fails", async () => {
      const previousArchive = makePolicy({
        _id: "archiveId",
        type: "archive",
        manager: ["mgr@example.com"],
      });
      policyModel.findOne.mockImplementation(
        (filter: Record<string, unknown>) => {
          if (!("type" in filter)) {
            return execResolving(makePolicy({ ownerGroup: "group1" }));
          }
          return execResolving(
            filter.type === "archive" ? previousArchive : null,
          );
        },
      );
      policyModel.findOneAndUpdate
        .mockReturnValueOnce(
          execResolving(makePolicy({ type: "archive", _id: "archiveId" })),
        )
        .mockReturnValueOnce({
          exec: jest.fn().mockRejectedValue(new Error("boom")),
        });

      await expect(
        service.updateWhere("group1", {
          tapeRedundancy: "high",
          retrieveEmailNotification: true,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(policyModel.replaceOne).toHaveBeenCalledWith(
        { _id: "archiveId" },
        expect.objectContaining({ manager: ["mgr@example.com"] }),
      );
      expect(policyModel.deleteOne).not.toHaveBeenCalledWith(
        expect.objectContaining({ _id: "archiveId" }),
      );
    });

    it("0610: deletes the archive side when the retrieve upsert fails and archive had no previous document", async () => {
      mockAddDefaultPolicyNoOp();
      policyModel.findOneAndUpdate
        .mockReturnValueOnce(
          execResolving(makePolicy({ type: "archive", _id: "archiveId" })),
        )
        .mockReturnValueOnce({
          exec: jest.fn().mockRejectedValue(new Error("boom")),
        });

      await expect(
        service.updateWhere("group1", {
          tapeRedundancy: "high",
          retrieveEmailNotification: true,
        }),
      ).rejects.toThrow(InternalServerErrorException);

      expect(policyModel.deleteOne).toHaveBeenCalledWith({
        _id: "archiveId",
      });
      expect(policyModel.replaceOne).not.toHaveBeenCalled();
    });

    it("0620: doesn't roll back anything when both upserts succeed", async () => {
      mockAddDefaultPolicyNoOp();
      policyModel.findOneAndUpdate.mockReturnValue(
        execResolving(makePolicy({ type: "archive" })),
      );

      await service.updateWhere("group1", {
        tapeRedundancy: "high",
        retrieveEmailNotification: true,
      });

      expect(policyModel.deleteOne).not.toHaveBeenCalled();
      expect(policyModel.replaceOne).not.toHaveBeenCalled();
    });
  });
});
