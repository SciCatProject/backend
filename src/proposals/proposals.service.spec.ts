import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { REQUEST } from "@nestjs/core";
import { BadRequestException } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { ProposalClass } from "./schemas/proposal.schema";
import { MetadataKeysService } from "src/metadata-keys/metadatakeys.service";
import { ProposalLookupKeysEnum } from "./types/proposal-lookup";

class MetadataKeysServiceMock {
  insertManyFromSource = jest.fn().mockResolvedValue([]);
  replaceManyFromSource = jest.fn().mockResolvedValue(undefined);
}

const mockProposal: ProposalClass = {
  proposalId: "ABCDEF",
  _id: "ABCDEF",
  pi_email: "testPi@email.com",
  pi_firstname: "testPiFirstname",
  pi_lastname: "testPiLastname",
  email: "testName@email.com",
  firstname: "testFirstname",
  lastname: "testLastname",
  title: "Test Proposal Title",
  abstract: "Test abstract.",
  startTime: new Date(),
  endTime: new Date(),
  ownerGroup: "testOwnerGroup",
  accessGroups: ["testAccessGroup"],
  instrumentGroup: "testInstrument",
  createdBy: "proposalIngestor",
  updatedBy: "proposalIngestor",
  MeasurementPeriodList: [],
  createdAt: new Date(),
  updatedAt: new Date(),
  isPublished: false,
};

class ProposalModelMock {
  new = jest.fn().mockResolvedValue(mockProposal);
  find = jest.fn().mockReturnValue({
    limit: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    exec: jest.fn().mockResolvedValue([mockProposal]),
  });
  aggregate = jest.fn().mockReturnValue({
    exec: jest.fn().mockResolvedValue([mockProposal]),
  });
  create = jest.fn();
  exec = jest.fn();
}

describe("ProposalsService", () => {
  let service: ProposalsService;
  let model: ProposalModelMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProposalsService,
        {
          provide: getModelToken(ProposalClass.name),
          useClass: ProposalModelMock,
        },
        { provide: MetadataKeysService, useClass: MetadataKeysServiceMock },
        { provide: REQUEST, useValue: { user: { username: "testUser" } } },
      ],
    }).compile();

    service = await module.resolve<ProposalsService>(ProposalsService);
    model = module.get(getModelToken(ProposalClass.name));
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("findAll", () => {
    it("should return proposals using find()", async () => {
      const result = await service.findAll({
        where: { proposalId: "ABCDEF" },
        limits: { limit: 5, skip: 0 },
      });

      expect(model.find).toHaveBeenCalledWith({ proposalId: "ABCDEF" });
      expect(result).toEqual([mockProposal]);
    });

    it("should apply default limits when not provided", async () => {
      await service.findAll({});
      expect(model.find).toHaveBeenCalled();
    });
  });

  describe("findAllComplete", () => {
    it("should call aggregate and return proposals", async () => {
      const result = await service.findAllComplete({
        where: { proposalId: "ABCDEF" },
      });

      expect(model.aggregate).toHaveBeenCalled();
      expect(result).toEqual([mockProposal]);
    });

    it("should include a $lookup stage for samples when include is set", async () => {
      await service.findAllComplete({
        where: { proposalId: "ABCDEF" },
        include: [ProposalLookupKeysEnum.samples],
      });

      const pipeline = model.aggregate.mock.calls[0][0];
      const lookupStage = pipeline.find(
        (s: { $lookup?: unknown }) => s.$lookup,
      );
      expect(lookupStage).toBeDefined();
      expect(lookupStage.$lookup.from).toBe("Sample");
      expect(lookupStage.$lookup.as).toBe("samples");
    });

    it("should include a $match stage inside the $lookup pipeline when scope.where is provided", async () => {
      await service.findAllComplete({
        where: { proposalId: "ABCDEF" },
        include: [
          {
            relation: ProposalLookupKeysEnum.samples,
            scope: { where: { ownerGroup: "group1" } },
          },
        ],
      });

      const pipeline = model.aggregate.mock.calls[0][0];
      const lookupStage = pipeline.find(
        (s: { $lookup?: unknown }) => s.$lookup,
      );
      expect(lookupStage.$lookup.pipeline).toContainEqual({
        $match: { ownerGroup: "group1" },
      });
    });

    it("should include $limit and $skip from scope.limits inside the $lookup pipeline", async () => {
      await service.findAllComplete({
        where: {},
        include: [
          {
            relation: ProposalLookupKeysEnum.samples,
            scope: { limits: { limit: 3, skip: 1 } },
          },
        ],
      });

      const pipeline = model.aggregate.mock.calls[0][0];
      const lookupStage = pipeline.find(
        (s: { $lookup?: unknown }) => s.$lookup,
      );
      expect(lookupStage.$lookup.pipeline).toContainEqual({ $limit: 3 });
      expect(lookupStage.$lookup.pipeline).toContainEqual({ $skip: 1 });
    });

    it("should expand 'all' into all non-all relations", async () => {
      await service.findAllComplete({
        where: {},
        include: [ProposalLookupKeysEnum.all],
      });

      const pipeline = model.aggregate.mock.calls[0][0];
      const lookupStages = pipeline.filter(
        (s: { $lookup?: unknown }) => s.$lookup,
      );
      expect(lookupStages.length).toBeGreaterThan(0);
      expect(
        lookupStages.every(
          (s: { $lookup: { as: string } }) => s.$lookup.as !== "all",
        ),
      ).toBe(true);
    });

    it("should throw BadRequestException when aggregate fails", async () => {
      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      await expect(service.findAllComplete({ where: {} })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should apply outer $skip and $limit to the pipeline", async () => {
      await service.findAllComplete({
        where: {},
        limits: { limit: 20, skip: 5 },
      });

      const pipeline = model.aggregate.mock.calls[0][0];
      expect(pipeline).toContainEqual({ $skip: 5 });
      expect(pipeline).toContainEqual({ $limit: 20 });
    });
  });

  describe("addLookupFields", () => {
    it("should add a $lookup stage for samples", () => {
      const pipeline: Parameters<typeof service.addLookupFields>[0] = [
        { $match: {} },
      ];
      service.addLookupFields(pipeline, [ProposalLookupKeysEnum.samples]);

      const lookupStage = pipeline.find((s) => "$lookup" in s) as
        | { $lookup: { from: string; as: string } }
        | undefined;
      expect(lookupStage).toBeDefined();
      expect(lookupStage!.$lookup.from).toBe("Sample");
      expect(lookupStage!.$lookup.as).toBe("samples");
    });

    it("should not add any stage for an empty include list", () => {
      const pipeline: Parameters<typeof service.addLookupFields>[0] = [
        { $match: {} },
      ];
      const added = service.addLookupFields(pipeline, []);

      expect(pipeline).toHaveLength(1);
      expect(added).toEqual([]);
    });

    it("should return the list of added relation names", () => {
      const pipeline: Parameters<typeof service.addLookupFields>[0] = [];
      const added = service.addLookupFields(pipeline, [
        ProposalLookupKeysEnum.samples,
      ]);
      expect(added).toEqual(["samples"]);
    });
  });
});
