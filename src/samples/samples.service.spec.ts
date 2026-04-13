import { ConfigService } from "@nestjs/config";
import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { SamplesService } from "./samples.service";
import { SampleClass } from "./schemas/sample.schema";
import { ScientificRelation } from "src/common/scientific-relation.enum";
import * as utils from "../common/utils";

jest.mock("../common/utils", () => {
  const mockUtils = jest.requireActual("../common/utils");
  const mockMapScientificQuery = jest.fn(mockUtils.mapScientificQuery);
  const mockCreateFullqueryFilter = jest.fn((model, idField, fields) => {
    mockMapScientificQuery("characteristics", fields.characteristics);

    // Call the actual createFullqueryFilter for real logic
    return mockUtils.createFullqueryFilter(model, idField, fields);
  });
  return {
    mapScientificQuery: mockMapScientificQuery,
    createFullqueryFilter: mockCreateFullqueryFilter,
    parseLimitFilters: jest
      .fn()
      .mockReturnValue({ limit: 10, skip: 0, sort: {} }),
  };
});

const mockSample: SampleClass = {
  _id: "testId",
  sampleId: "testId",
  owner: "Test Owner",
  description: "Test Sample",
  createdAt: new Date(),
  updatedAt: new Date(),
  sampleCharacteristics: {},
  isPublished: false,
  ownerGroup: "testOwnerGroup",
  accessGroups: ["testAccessGroup"],
  instrumentGroup: "testInstrument",
  createdBy: "testUser",
  updatedBy: "testUser",
};

describe("SamplesService", () => {
  let service: SamplesService;
  let sampleModel: Model<SampleClass>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ConfigService,
        SamplesService,
        {
          provide: getModelToken("SampleClass"),
          useValue: {
            new: jest.fn().mockResolvedValue(mockSample),
            constructor: jest.fn().mockResolvedValue(mockSample),
            find: jest.fn().mockReturnThis(), // Chainable
            create: jest.fn(),
            exec: jest.fn(),
          },
        },
      ],
    }).compile();

    service = await module.resolve<SamplesService>(SamplesService);
    sampleModel = module.get<Model<SampleClass>>(getModelToken("SampleClass"));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should correctly apply text and characteristics filters to find samples", async () => {
    const filter = {
      fields: {
        text: "test",
        characteristics: [
          {
            lhs: "test",
            relation: ScientificRelation.EQUAL_TO_STRING,
            rhs: "test",
            unit: "test",
          },
        ],
      },
    };

    const mapScientificQueryResponse = {
      $text: {
        $search: "test",
      },
      $or: [
        {
          "sampleCharacteristics.test": {
            $eq: "test",
          },
        },
        {
          "sampleCharacteristics.test.v": {
            $eq: "test",
          },
        },
        {
          "sampleCharacteristics.test.value": {
            $eq: "test",
          },
        },
      ],
    };

    await service.fullquery(filter);

    expect(utils.createFullqueryFilter).toHaveBeenCalledWith(
      sampleModel,
      "sampleId",
      filter.fields,
    );
    expect(utils.mapScientificQuery).toHaveBeenCalledWith(
      "characteristics",
      filter["fields"]["characteristics"],
    );
    expect(sampleModel.find).toHaveBeenCalledWith(
      mapScientificQueryResponse,
      null,
      { limit: 10, skip: 0, sort: {} },
    );
  });
});
