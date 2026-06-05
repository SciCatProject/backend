import { Logger } from "@nestjs/common";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { MetadataKeysService, MetadataSourceDoc } from "./metadatakeys.service";
import { MetadataKeyClass } from "./schemas/metadatakey.schema";

class MetadataKeyModelMock {
  aggregate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([{ key: "k1" }]),
  });
  deleteMany = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue({ deletedCount: 2 }),
  });
  insertMany = jest.fn().mockReturnValue([{ _id: "id1" }]);
}

describe("MetadataKeysService", () => {
  let service: MetadataKeysService;
  let model: MetadataKeyModelMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MetadataKeysService,
        {
          provide: getModelToken(MetadataKeyClass.name),
          useClass: MetadataKeyModelMock,
        },
      ],
    }).compile();

    service = await module.resolve(MetadataKeysService);
    model = module.get(
      getModelToken(MetadataKeyClass.name),
    ) as unknown as MetadataKeyModelMock;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("findAll builds aggregation pipeline and executes it", async () => {
    const filter = {
      where: { sourceType: "dataset" },
      fields: ["key"],
      limits: { limit: 10, skip: 0, sort: { createdAt: "asc" } },
    };

    const accessFilter = { userGroups: { $in: ["ess"] } };

    const res = await service.findAll(filter, accessFilter);

    expect(model.aggregate).toHaveBeenCalledTimes(1);

    const pipeline = model.aggregate.mock.calls[0][0];
    expect(pipeline[0]).toEqual({
      $match: { $and: [accessFilter, filter.where] },
    });

    expect(res).toEqual([{ key: "k1" }]);
  });

  it("deleteMany deletes and logs result", async () => {
    const logSpy = jest.spyOn(Logger, "log").mockImplementation();

    const filter = { sourceType: "dataset", sourceId: "sid" };
    const result = await service.deleteMany(filter);

    expect(model.deleteMany).toHaveBeenCalledWith(filter);
    expect(result.deletedCount).toBe(2);
    expect(logSpy).toHaveBeenCalled();
  });

  it("insertManyFromSource does nothing when metadata is empty", async () => {
    const doc: MetadataSourceDoc = {
      sourceId: "sid",
      sourceType: "dataset",
      ownerGroup: "ess",
      accessGroups: ["ess"],
      isPublished: false,
      metadata: {},
    };

    const res = await service.insertManyFromSource(doc);

    expect(res).toBeUndefined();
    expect(model.insertMany).not.toHaveBeenCalled();
  });

  it("insertManyFromSource creates metadata keys", async () => {
    const doc: MetadataSourceDoc = {
      sourceId: "sid",
      sourceType: "dataset",
      ownerGroup: "ess",
      accessGroups: ["swap", "ess"],
      isPublished: false,
      metadata: {
        key1: { human_name: "Key One" },
        key2: {},
      },
    };

    const res = await service.insertManyFromSource(doc);

    expect(model.insertMany).toHaveBeenCalledTimes(1);

    const insertedDocs = model.insertMany.mock.calls[0][0];
    expect(insertedDocs).toHaveLength(2);

    expect(insertedDocs[0]).toMatchObject({
      key: "key1",
      humanReadableName: "Key One",
      sourceType: "dataset",
      sourceId: "sid",
    });

    expect(res).toEqual([{ _id: "id1" }]);
  });

  it("replaceManyFromSource deletes then inserts", async () => {
    const doc: MetadataSourceDoc = {
      sourceId: "sid",
      sourceType: "dataset",
      ownerGroup: "ess",
      accessGroups: ["swap"],
      isPublished: false,
      metadata: { key1: {} },
    };

    const deleteSpy = jest.spyOn(service, "deleteMany");
    const insertSpy = jest.spyOn(service, "insertManyFromSource");

    await service.replaceManyFromSource(doc);

    expect(deleteSpy).toHaveBeenCalledWith({
      sourceId: "sid",
      sourceType: "dataset",
    });
    expect(insertSpy).toHaveBeenCalledWith(doc);
  });
});
