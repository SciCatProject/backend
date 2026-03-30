import { getModelToken } from "@nestjs/mongoose";
import { Test, TestingModule } from "@nestjs/testing";
import { Model } from "mongoose";
import { REQUEST } from "@nestjs/core";
import { BadRequestException } from "@nestjs/common";
import { ProposalsService } from "./proposals.service";
import { ProposalClass } from "./schemas/proposal.schema";
import { MetadataKeysService } from "src/metadata-keys/metadatakeys.service";
import { ProposalLookupKeysEnum } from "./types/proposal-lookup";
import { IProposalFilters } from "./interfaces/proposal-relations.interface";
import { IFilters } from "src/common/interfaces/common.interface";
import { IProposalFields } from "./interfaces/proposal-filters.interface";

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
      const filter: IFilters<any, IProposalFields> = {
        where: { proposalId: "ABCDEF" },
        limits: { limit: 5, skip: 0 },
      };

      const result = await service.findAll(filter);

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
      const filter: IProposalFilters<any, IProposalFields> = {
        where: { proposalId: "ABCDEF" },
      };

      const result = await service.findAllComplete(filter);

      expect(model.aggregate).toHaveBeenCalled();
      expect(result).toEqual([mockProposal]);
    });

    it("should include a $lookup stage for samples when include is set", async () => {
      const filter: IProposalFilters<any, IProposalFields> = {
        where: { proposalId: "ABCDEF" },
        include: [ProposalLookupKeysEnum.samples],
      };

      await service.findAllComplete(filter);

      const pipeline: any[] = model.aggregate.mock.calls[0][0];
      const lookupStage = pipeline.find((s) => s.$lookup);
      expect(lookupStage).toBeDefined();
      expect(lookupStage.$lookup.from).toBe("Sample");
      expect(lookupStage.$lookup.as).toBe("samples");
    });

    it("should include a $match stage inside the $lookup pipeline when scope.where is provided", async () => {
      const filter: IProposalFilters<any, IProposalFields> = {
        where: { proposalId: "ABCDEF" },
        include: [
          {
            relation: ProposalLookupKeysEnum.samples,
            scope: { where: { ownerGroup: "group1" } },
          },
        ],
      };

      await service.findAllComplete(filter);

      const pipeline: any[] = model.aggregate.mock.calls[0][0];
      const lookupStage = pipeline.find((s) => s.$lookup);
      expect(lookupStage.$lookup.pipeline).toContainEqual({
        $match: { ownerGroup: "group1" },
      });
    });

    it("should include $limit and $skip from scope.limits inside the $lookup pipeline", async () => {
      const filter: IProposalFilters<any, IProposalFields> = {
        where: {},
        include: [
          {
            relation: ProposalLookupKeysEnum.samples,
            scope: { limits: { limit: 3, skip: 1 } },
          },
        ],
      };

      await service.findAllComplete(filter);

      const pipeline: any[] = model.aggregate.mock.calls[0][0];
      const lookupStage = pipeline.find((s) => s.$lookup);
      expect(lookupStage.$lookup.pipeline).toContainEqual({ $limit: 3 });
      expect(lookupStage.$lookup.pipeline).toContainEqual({ $skip: 1 });
    });

    it("should expand 'all' into all non-all relations", async () => {
      const filter: IProposalFilters<any, IProposalFields> = {
        where: {},
        include: [ProposalLookupKeysEnum.all],
      };

      await service.findAllComplete(filter);

      const pipeline: any[] = model.aggregate.mock.calls[0][0];
      const lookupStages = pipeline.filter((s) => s.$lookup);
      // 'all' should expand to every defined relation (excluding 'all' itself)
      expect(lookupStages.length).toBeGreaterThan(0);
      expect(lookupStages.every((s) => s.$lookup.as !== "all")).toBe(true);
    });

    it("should throw BadRequestException when aggregate fails", async () => {
      model.aggregate.mockReturnValueOnce({
        exec: jest.fn().mockRejectedValue(new Error("DB error")),
      });

      const filter: IProposalFilters<any, IProposalFields> = { where: {} };

      await expect(service.findAllComplete(filter)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("should apply outer $skip and $limit to the pipeline", async () => {
      const filter: IProposalFilters<any, IProposalFields> = {
        where: {},
        limits: { limit: 20, skip: 5 },
      };

      await service.findAllComplete(filter);

      const pipeline: any[] = model.aggregate.mock.calls[0][0];
      expect(pipeline).toContainEqual({ $skip: 5 });
      expect(pipeline).toContainEqual({ $limit: 20 });
    });
  });

  describe("addLookupFields", () => {
    it("should add a $lookup stage for samples", () => {
      const pipeline: any[] = [{ $match: {} }];
      service.addLookupFields(pipeline, [ProposalLookupKeysEnum.samples]);

      const lookupStage = pipeline.find((s) => s.$lookup);
      expect(lookupStage).toBeDefined();
      expect(lookupStage.$lookup.from).toBe("Sample");
      expect(lookupStage.$lookup.as).toBe("samples");
    });

    it("should not add any stage for an empty include list", () => {
      const pipeline: any[] = [{ $match: {} }];
      const added = service.addLookupFields(pipeline, []);

      expect(pipeline).toHaveLength(1);
      expect(added).toEqual([]);
    });

    it("should return the list of added relation names", () => {
      const pipeline: any[] = [];
      const added = service.addLookupFields(pipeline, [
        ProposalLookupKeysEnum.samples,
      ]);
      expect(added).toEqual(["samples"]);
    });
  });
});
