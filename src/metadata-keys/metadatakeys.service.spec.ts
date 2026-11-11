/* eslint-disable @typescript-eslint/no-explicit-any */
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MetadataKeysService, MetadataSourceDoc } from "./metadatakeys.service";
import { MetadataKeyClass } from "./schemas/metadatakey.schema";

const modelMock = {
  aggregate: jest
    .fn()
    .mockReturnValue({ exec: jest.fn().mockResolvedValue([]) }),
  bulkWrite: jest.fn().mockResolvedValue({}),
  updateMany: jest.fn().mockResolvedValue({}),
  deleteMany: jest.fn().mockResolvedValue({}),
};

const BASE_DOC: MetadataSourceDoc = {
  sourceType: "Dataset",
  userGroups: ["group-1", "group-2"],
  isPublished: false,
  metadata: {
    temperature: { human_name: "Temperature" },
    pressure: {},
  },
};

describe("MetadataKeysService", () => {
  let service: MetadataKeysService;

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetadataKeysService,
        {
          provide: getModelToken(MetadataKeyClass.name),
          useValue: modelMock,
        },
      ],
    }).compile();

    service = await module.resolve(MetadataKeysService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  // -------------------------------------------------------------------------
  // findAll
  // -------------------------------------------------------------------------

  describe("findAll", () => {
    it("builds a pipeline with match, project, sort, skip, limit", async () => {
      const accessFilter = { userGroups: { $in: ["group-1"] } };
      const filter = {
        where: { sourceType: "Dataset" },
        fields: ["key", "humanReadableName"],
        limits: { limit: 10, skip: 5, sort: { createdAt: "asc" } },
      };

      await service.findAll(filter, accessFilter);

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      expect(pipeline[0]).toEqual({
        $match: { $and: [accessFilter, filter.where] },
      });
      expect(pipeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ $project: expect.any(Object) }),
          expect.objectContaining({ $sort: expect.any(Object) }),
          expect.objectContaining({ $skip: 5 }),
          expect.objectContaining({ $limit: 10 }),
        ]),
      );
    });

    it("applies default limits when none provided", async () => {
      await service.findAll({}, {});

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      expect(pipeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ $skip: 0 }),
          expect.objectContaining({ $limit: 100 }),
        ]),
      );
    });

    it("applies default sort when no limits provided", async () => {
      await service.findAll({}, {});

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      expect(pipeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ $sort: { createdAt: -1 } }),
        ]),
      );
    });

    it("returns decoded userGroupCounts keys", async () => {
      modelMock.aggregate.mockReturnValueOnce({
        exec: jest
          .fn()
          .mockResolvedValue([
            { key: "k", userGroupCounts: { "p21%2E2": 2, "%24x": 1, g: 3 } },
          ]),
      });

      const [doc] = await service.findAll({}, {});

      expect(doc.userGroupCounts).toEqual({ "p21.2": 2, $x: 1, g: 3 });
    });

    it("applies default sort when limits provided without sort", async () => {
      await service.findAll({ limits: { limit: 10, skip: 0 } }, {});

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      expect(pipeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ $sort: { createdAt: -1 } }),
        ]),
      );
    });

    it("uses provided sort when specified", async () => {
      await service.findAll(
        { limits: { limit: 10, skip: 0, sort: { key: "asc" } } },
        {},
      );

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      expect(pipeline).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            $sort: expect.objectContaining({ key: 1 }),
          }),
        ]),
      );
    });

    it("omits $project stage when no fields specified", async () => {
      await service.findAll({}, {});

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      const hasProject = pipeline.some((s: object) => "$project" in s);
      expect(hasProject).toBe(false);
    });

    it("sort stage comes before skip and limit", async () => {
      await service.findAll({}, {});

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      const sortIndex = pipeline.findIndex((s: object) => "$sort" in s);
      const skipIndex = pipeline.findIndex((s: object) => "$skip" in s);
      const limitIndex = pipeline.findIndex((s: object) => "$limit" in s);
      expect(sortIndex).toBeLessThan(skipIndex);
      expect(sortIndex).toBeLessThan(limitIndex);
    });

    it("returns aggregation results", async () => {
      const mockData = [{ key: "temperature" }, { key: "pressure" }];
      modelMock.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockResolvedValue(mockData),
      });

      const result = await service.findAll({}, {});

      expect(result).toEqual(mockData);
    });
  });

  // -------------------------------------------------------------------------
  // insertManyFromSource
  // -------------------------------------------------------------------------

  describe("insertManyFromSource", () => {
    it("does nothing when metadata is empty", async () => {
      await service.insertManyFromSource({ ...BASE_DOC, metadata: {} });

      expect(modelMock.bulkWrite).not.toHaveBeenCalled();
    });

    it("calls bulkWrite with one op per metadata key", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      expect(ops).toHaveLength(2);
    });

    it("builds correct filter from sourceType + key + humanReadableName", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const filters = ops.map((op: any) => op.updateOne.filter);
      expect(filters).toContainEqual({
        sourceType: "Dataset",
        key: "temperature",
        humanReadableName: "Temperature",
      });
      expect(filters).toContainEqual({
        sourceType: "Dataset",
        key: "pressure",
        humanReadableName: "",
      });
    });

    it("increments usageCount and per-group counts", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { update } = ops[0].updateOne;
      expect(update.$inc.usageCount).toBe(1);
      expect(update.$inc["userGroupCounts.group-1"]).toBe(1);
      expect(update.$inc["userGroupCounts.group-2"]).toBe(1);
    });

    it("escapes group names that are not valid field names", async () => {
      await service.insertManyFromSource({
        ...BASE_DOC,
        userGroups: ["p21.2", "$grp", "a%2Eb"],
      });

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { update } = ops[0].updateOne;
      expect(update.$inc["userGroupCounts.p21%2E2"]).toBe(1);
      expect(update.$inc["userGroupCounts.%24grp"]).toBe(1);
      expect(update.$inc["userGroupCounts.a%252Eb"]).toBe(1);
      expect(update.$addToSet.userGroups.$each).toEqual([
        "p21.2",
        "$grp",
        "a%2Eb",
      ]);
    });

    it("adds userGroups via $addToSet", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { update } = ops[0].updateOne;
      expect(update.$addToSet.userGroups.$each).toEqual(["group-1", "group-2"]);
    });

    it("sets isPublished when dataset is published", async () => {
      await service.insertManyFromSource({ ...BASE_DOC, isPublished: true });

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { update } = ops[0].updateOne;
      expect(update.$max.isPublished).toBe(true);
    });

    it("does not set isPublished when dataset is not published", async () => {
      await service.insertManyFromSource({ ...BASE_DOC, isPublished: false });

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { update } = ops[0].updateOne;
      expect(update.$max?.isPublished).toBeFalsy();
    });

    it("sets upsert: true", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      expect(ops[0].updateOne.upsert).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // deleteMany
  // -------------------------------------------------------------------------

  describe("deleteMany", () => {
    it("does nothing when metadata is empty", async () => {
      await service.deleteMany({ ...BASE_DOC, metadata: {} });

      expect(modelMock.bulkWrite).not.toHaveBeenCalled();
      expect(modelMock.updateMany).not.toHaveBeenCalled();
      expect(modelMock.deleteMany).not.toHaveBeenCalled();
    });

    it("runs operations in order: decrement → prune groups → delete", async () => {
      const callOrder: string[] = [];
      // label each bulkWrite by its ops: updateOne = decrement, updateMany = prune
      modelMock.bulkWrite.mockImplementation((ops: any[]) => {
        callOrder.push(ops[0].updateOne ? "decrement" : "prune");
        return Promise.resolve({});
      });
      modelMock.deleteMany.mockImplementation(() => {
        callOrder.push("deleteMany");
        return Promise.resolve({});
      });

      await service.deleteMany(BASE_DOC);

      expect(callOrder).toEqual(["decrement", "prune", "deleteMany"]);
    });

    it("decrements usageCount and per-group counts", async () => {
      await service.deleteMany(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { update } = ops[0].updateOne;
      expect(update.$inc.usageCount).toBe(-1);
      expect(update.$inc["userGroupCounts.group-1"]).toBe(-1);
      expect(update.$inc["userGroupCounts.group-2"]).toBe(-1);
    });

    it("targets correct filter based on metadata keys and humanReadableName", async () => {
      await service.deleteMany(BASE_DOC);

      const [deleteFilter] = modelMock.deleteMany.mock.calls[0];
      const firstFilter = deleteFilter.$and[0];
      expect(firstFilter.$or).toContainEqual({
        sourceType: "Dataset",
        key: "temperature",
        humanReadableName: "Temperature",
      });
      expect(firstFilter.$or).toContainEqual({
        sourceType: "Dataset",
        key: "pressure",
        humanReadableName: "",
      });
    });

    it("deletes documents where usageCount <= 0", async () => {
      await service.deleteMany(BASE_DOC);

      const [deleteFilter] = modelMock.deleteMany.mock.calls[0];
      expect(deleteFilter.$and[1].usageCount).toEqual({ $lte: 0 });
    });

    it("removes groups whose count reached zero", async () => {
      await service.deleteMany({ ...BASE_DOC, userGroups: ["p21.2", "$x"] });

      const [ops] = modelMock.bulkWrite.mock.calls[1];
      expect(ops.map((op: any) => op.updateMany)).toEqual([
        {
          filter: expect.objectContaining({
            "userGroupCounts.p21%2E2": { $lte: 0 },
          }),
          update: {
            $pull: { userGroups: "p21.2" },
            $unset: { "userGroupCounts.p21%2E2": "" },
          },
        },
        {
          filter: expect.objectContaining({
            "userGroupCounts.%24x": { $lte: 0 },
          }),
          update: {
            $pull: { userGroups: "$x" },
            $unset: { "userGroupCounts.%24x": "" },
          },
        },
      ]);
    });

    it("does not set upsert on decrement ops", async () => {
      await service.deleteMany(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      expect(ops[0].updateOne.upsert).toBe(false);
    });
  });

  // -------------------------------------------------------------------------
  // replaceManyFromSource
  // -------------------------------------------------------------------------

  describe("replaceManyFromSource", () => {
    it("calls deleteMany with oldDoc then insertManyFromSource with newDoc", async () => {
      const deleteSpy = jest.spyOn(service, "deleteMany").mockResolvedValue();
      const insertSpy = jest
        .spyOn(service, "insertManyFromSource")
        .mockResolvedValue();

      await service.replaceManyFromSource(BASE_DOC, BASE_DOC);

      expect(deleteSpy).toHaveBeenCalledWith(BASE_DOC);
      expect(insertSpy).toHaveBeenCalledWith(BASE_DOC);
    });

    it("calls deleteMany before insertManyFromSource", async () => {
      const callOrder: string[] = [];
      jest.spyOn(service, "deleteMany").mockImplementation(async () => {
        callOrder.push("deleteMany");
      });
      jest
        .spyOn(service, "insertManyFromSource")
        .mockImplementation(async () => {
          callOrder.push("insertManyFromSource");
        });

      await service.replaceManyFromSource(BASE_DOC, BASE_DOC);

      expect(callOrder).toEqual(["deleteMany", "insertManyFromSource"]);
    });

    it("net usageCount is zero for unchanged keys", async () => {
      const doc = {
        ...BASE_DOC,
        metadata: { temperature: { human_name: "Temperature" } },
      };

      await service.replaceManyFromSource(doc, doc);

      const allOps = modelMock.bulkWrite.mock.calls
        .flatMap(([ops]: any) => ops)
        .filter((op: any) => op.updateOne); // skip the group-pruning ops
      const totalUsageCountDelta = allOps.reduce(
        (sum: number, op: any) => sum + op.updateOne.update.$inc.usageCount,
        0,
      );
      expect(totalUsageCountDelta).toBe(0);
    });
  });
});
