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

    it("omits $project stage when no fields specified", async () => {
      await service.findAll({}, {});

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      const hasProject = pipeline.some((s: object) => "$project" in s);
      expect(hasProject).toBe(false);
    });

    it("omits $sort stage when no sort specified", async () => {
      await service.findAll({ limits: { limit: 10, skip: 0 } }, {});

      const [pipeline] = modelMock.aggregate.mock.calls[0];
      const hasSort = pipeline.some((s: object) => "$sort" in s);
      expect(hasSort).toBe(false);
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

    it("calls bulkWrite with one updateOne per metadata key", async () => {
      await service.insertManyFromSource(BASE_DOC);

      expect(modelMock.bulkWrite).toHaveBeenCalledTimes(1);
      const [ops] = modelMock.bulkWrite.mock.calls[0];
      expect(ops).toHaveLength(2);
      expect(ops.every((op: object) => "updateOne" in op)).toBe(true);
    });

    it("builds correct _id from sourceType + key + humanReadableName", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const ids = ops.map(
        (op: { updateOne: { filter: { _id: string } } }) =>
          op.updateOne.filter._id,
      );

      expect(ids).toContain("Dataset_temperature_Temperature");
      expect(ids).toContain("Dataset_pressure_"); // no human_name
    });

    it("sets upsert: true on every operation", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      expect(
        ops.every(
          (op: { updateOne: { upsert: boolean } }) =>
            op.updateOne.upsert === true,
        ),
      ).toBe(true);
    });

    it("increments usageCount and per-group counts", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { $inc } = ops[0].updateOne.update;

      expect($inc.usageCount).toBe(1);
      expect($inc["userGroupCounts.group-1"]).toBe(1);
      expect($inc["userGroupCounts.group-2"]).toBe(1);
    });

    it("adds userGroups via $addToSet", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { $addToSet } = ops[0].updateOne.update;

      expect($addToSet.userGroups.$each).toEqual(["group-1", "group-2"]);
    });

    it("sets isPublished when dataset is published", async () => {
      await service.insertManyFromSource({ ...BASE_DOC, isPublished: true });

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      expect(ops[0].updateOne.update.$set.isPublished).toBe(true);
    });

    it("does not set isPublished when dataset is not published", async () => {
      await service.insertManyFromSource({ ...BASE_DOC, isPublished: false });

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      expect(ops[0].updateOne.update.$set.isPublished).toBeUndefined();
    });

    it("uses $setOnInsert for immutable fields", async () => {
      await service.insertManyFromSource(BASE_DOC);

      const [ops] = modelMock.bulkWrite.mock.calls[0];
      const { $setOnInsert } = ops[0].updateOne.update;

      expect($setOnInsert).toMatchObject({
        key: expect.any(String),
        sourceType: "Dataset",
        humanReadableName: expect.any(String),
      });
    });
  });

  // -------------------------------------------------------------------------
  // deleteMany
  // -------------------------------------------------------------------------

  describe("deleteMany", () => {
    it("does nothing when metadata is empty", async () => {
      await service.deleteMany({ ...BASE_DOC, metadata: {} });

      expect(modelMock.updateMany).not.toHaveBeenCalled();
      expect(modelMock.deleteMany).not.toHaveBeenCalled();
    });

    it("runs three operations in order: decrement → recompute → delete", async () => {
      const callOrder: string[] = [];
      modelMock.updateMany.mockImplementation(() => {
        callOrder.push("updateMany");
        return Promise.resolve({});
      });
      modelMock.deleteMany.mockImplementation(() => {
        callOrder.push("deleteMany");
        return Promise.resolve({});
      });

      await service.deleteMany(BASE_DOC);

      expect(callOrder).toEqual(["updateMany", "updateMany", "deleteMany"]);
    });

    it("decrements usageCount and per-group counts", async () => {
      await service.deleteMany(BASE_DOC);

      const [, firstUpdate] = modelMock.updateMany.mock.calls[0];
      expect(firstUpdate.$inc.usageCount).toBe(-1);
      expect(firstUpdate.$inc["userGroupCounts.group-1"]).toBe(-1);
      expect(firstUpdate.$inc["userGroupCounts.group-2"]).toBe(-1);
    });

    it("targets correct _ids based on metadata keys and humanReadableName", async () => {
      await service.deleteMany(BASE_DOC);

      const [firstFilter] = modelMock.updateMany.mock.calls[0];
      expect(firstFilter._id.$in).toContain("Dataset_temperature_Temperature");
      expect(firstFilter._id.$in).toContain("Dataset_pressure_");
    });

    it("deletes documents where usageCount <= 0", async () => {
      await service.deleteMany(BASE_DOC);

      const [deleteFilter] = modelMock.deleteMany.mock.calls[0];
      expect(deleteFilter.usageCount).toEqual({ $lte: 0 });
    });

    it("recompute stage uses $set with $objectToArray on userGroupCounts", async () => {
      await service.deleteMany(BASE_DOC);

      // second updateMany call is the RECOMPUTE_USER_GROUPS_STAGE
      const [, recomputeStage] = modelMock.updateMany.mock.calls[1];
      expect(recomputeStage[0].$set.userGroups).toBeDefined();
    });
  });

  // -------------------------------------------------------------------------
  // replaceManyFromSource
  // -------------------------------------------------------------------------

  describe("replaceManyFromSource", () => {
    it("calls insertManyFromSource for keys only in newDoc", async () => {
      const insertSpy = jest
        .spyOn(service, "insertManyFromSource")
        .mockResolvedValue();

      const oldDoc = {
        ...BASE_DOC,
        metadata: { temperature: { human_name: "Temperature" } },
      };
      const newDoc = {
        ...BASE_DOC,
        metadata: {
          temperature: { human_name: "Temperature" },
          wavelength: {},
        },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { wavelength: {} } }),
      );
    });

    it("calls deleteMany for keys only in oldDoc", async () => {
      const deleteSpy = jest.spyOn(service, "deleteMany").mockResolvedValue();

      const oldDoc = {
        ...BASE_DOC,
        metadata: { temperature: { human_name: "Temperature" }, pressure: {} },
      };
      const newDoc = {
        ...BASE_DOC,
        metadata: { temperature: { human_name: "Temperature" } },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      expect(deleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { pressure: {} } }),
      );
    });

    it("does not call deleteMany or insertManyFromSource for shared unchanged keys", async () => {
      const deleteSpy = jest.spyOn(service, "deleteMany").mockResolvedValue();
      const insertSpy = jest
        .spyOn(service, "insertManyFromSource")
        .mockResolvedValue();

      const doc = {
        ...BASE_DOC,
        metadata: { temperature: { human_name: "Temperature" } },
      };

      await service.replaceManyFromSource(doc, doc);

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(insertSpy).not.toHaveBeenCalled();
    });

    it("handles all three buckets simultaneously", async () => {
      const deleteSpy = jest.spyOn(service, "deleteMany").mockResolvedValue();
      const insertSpy = jest
        .spyOn(service, "insertManyFromSource")
        .mockResolvedValue();

      const oldDoc = {
        ...BASE_DOC,
        metadata: { temperature: { human_name: "Temperature" }, pressure: {} },
      };
      const newDoc = {
        ...BASE_DOC,
        metadata: {
          temperature: { human_name: "Temperature" },
          wavelength: {},
        },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      // pressure removed → deleteMany
      expect(deleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { pressure: {} } }),
      );
      // wavelength added → insertManyFromSource
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({ metadata: { wavelength: {} } }),
      );
    });

    it("does nothing when both docs have empty metadata", async () => {
      const deleteSpy = jest.spyOn(service, "deleteMany").mockResolvedValue();
      const insertSpy = jest
        .spyOn(service, "insertManyFromSource")
        .mockResolvedValue();

      const empty = { ...BASE_DOC, metadata: {} };
      await service.replaceManyFromSource(empty, empty);

      expect(deleteSpy).not.toHaveBeenCalled();
      expect(insertSpy).not.toHaveBeenCalled();
    });
  });

  // -------------------------------------------------------------------------
  // updateSharedKeys (tested via replaceManyFromSource)
  // -------------------------------------------------------------------------

  describe("updateSharedKeys (via replaceManyFromSource)", () => {
    it("increments added groups and decrements removed groups", async () => {
      const oldDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        userGroups: ["group-1"],
        metadata: { temperature: { human_name: "Temperature" } },
      };
      const newDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        userGroups: ["group-2"],
        metadata: { temperature: { human_name: "Temperature" } },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      const [, update] = modelMock.updateMany.mock.calls[0];
      expect(update.$inc["userGroupCounts.group-2"]).toBe(1);
      expect(update.$inc["userGroupCounts.group-1"]).toBe(-1);
    });

    it("runs RECOMPUTE_USER_GROUPS_STAGE when groups are removed", async () => {
      const oldDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        userGroups: ["group-1", "group-2"],
        metadata: { temperature: { human_name: "Temperature" } },
      };
      const newDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        userGroups: ["group-1"],
        metadata: { temperature: { human_name: "Temperature" } },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      // two updateMany calls: one for the $inc, one for RECOMPUTE
      expect(modelMock.updateMany).toHaveBeenCalledTimes(2);
    });

    it("does not run RECOMPUTE_USER_GROUPS_STAGE when only groups are added", async () => {
      const oldDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        userGroups: ["group-1"],
        metadata: { temperature: { human_name: "Temperature" } },
      };
      const newDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        userGroups: ["group-1", "group-2"],
        metadata: { temperature: { human_name: "Temperature" } },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      // only one updateMany — no RECOMPUTE needed when nothing is removed
      expect(modelMock.updateMany).toHaveBeenCalledTimes(1);
    });

    it("sets isPublished when it flips from false to true", async () => {
      const oldDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        isPublished: false,
        metadata: { temperature: { human_name: "Temperature" } },
      };
      const newDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        isPublished: true,
        metadata: { temperature: { human_name: "Temperature" } },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      const [, update] = modelMock.updateMany.mock.calls[0];
      expect(update.$set.isPublished).toBe(true);
    });

    it("does not touch isPublished when it flips from true to false", async () => {
      const oldDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        isPublished: true,
        metadata: { temperature: { human_name: "Temperature" } },
      };
      const newDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        isPublished: false,
        metadata: { temperature: { human_name: "Temperature" } },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      // no group changes and no publishedFlippedOn → updateMany not called at all
      expect(modelMock.updateMany).not.toHaveBeenCalled();
    });

    it("treats humanReadableName change as delete + insert", async () => {
      const deleteSpy = jest.spyOn(service, "deleteMany").mockResolvedValue();
      const insertSpy = jest
        .spyOn(service, "insertManyFromSource")
        .mockResolvedValue();

      const oldDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        metadata: { temperature: { human_name: "Temperature" } },
      };
      const newDoc: MetadataSourceDoc = {
        ...BASE_DOC,
        metadata: { temperature: { human_name: "Temp (renamed)" } },
      };

      await service.replaceManyFromSource(oldDoc, newDoc);

      expect(deleteSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { temperature: { human_name: "Temperature" } },
        }),
      );
      expect(insertSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          metadata: { temperature: { human_name: "Temp (renamed)" } },
        }),
      );
    });
  });
});
