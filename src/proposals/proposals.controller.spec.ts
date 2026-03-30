import { Test, TestingModule } from "@nestjs/testing";
import type { Request } from "express";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsController } from "./proposals.controller";
import { ProposalsService } from "./proposals.service";
import { NotFoundException, HttpException } from "@nestjs/common";
import { PartialUpdateProposalDto } from "./dto/update-proposal.dto";
import { ProposalClass } from "./schemas/proposal.schema";
import { ProposalLookupKeysEnum } from "./types/proposal-lookup";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}

class ProposalsServiceMock {
  findOne = jest.fn();
  findAll = jest.fn();
  findAllComplete = jest.fn();
  update = jest.fn();
}

class CaslAbilityFactoryMock {
  proposalsInstanceAccess = jest.fn().mockReturnValue({
    can: jest.fn().mockReturnValue(true),
  });
}

const mockProposal: Partial<ProposalClass> = {
  proposalId: "ABCDEF",
  title: "Test Proposal",
  email: "test@example.com",
  ownerGroup: "testGroup",
  accessGroups: [],
  isPublished: false,
  updatedAt: new Date("2023-01-01"),
};

describe("ProposalsController", () => {
  let controller: ProposalsController;
  let proposalsService: ProposalsServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProposalsController],
      providers: [
        { provide: AttachmentsService, useClass: AttachmentsServiceMock },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
        { provide: ProposalsService, useClass: ProposalsServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<ProposalsController>(ProposalsController);
    proposalsService = module.get(ProposalsService);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("findAll", () => {
    const mockAdminRequest = {
      user: { currentGroups: ["admin"], username: "admin" },
    } as unknown as Request;

    it("should call findAll when no include is provided", async () => {
      proposalsService.findAll.mockResolvedValue([mockProposal]);

      const result = await controller.findAll(mockAdminRequest, "{}");

      expect(proposalsService.findAll).toHaveBeenCalled();
      expect(proposalsService.findAllComplete).not.toHaveBeenCalled();
      expect(result).toEqual([mockProposal]);
    });

    it("should call findAllComplete when include is provided", async () => {
      proposalsService.findAllComplete.mockResolvedValue([mockProposal]);
      const filters = JSON.stringify({
        where: { proposalId: "ABCDEF" },
        include: [ProposalLookupKeysEnum.samples],
      });

      const result = await controller.findAll(mockAdminRequest, filters);

      expect(proposalsService.findAllComplete).toHaveBeenCalled();
      expect(proposalsService.findAll).not.toHaveBeenCalled();
      expect(result).toEqual([mockProposal]);
    });

    it("should pass where filter through to the service", async () => {
      proposalsService.findAll.mockResolvedValue([]);
      const filters = JSON.stringify({ where: { proposalId: "TEST123" } });

      await controller.findAll(mockAdminRequest, filters);

      const calledWith = proposalsService.findAll.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({ proposalId: "TEST123" });
    });

    it("should pass include and where to findAllComplete", async () => {
      proposalsService.findAllComplete.mockResolvedValue([]);
      const filters = JSON.stringify({
        where: { proposalId: "TEST123" },
        include: [{ relation: "samples", scope: { limits: { limit: 5 } } }],
      });

      await controller.findAll(mockAdminRequest, filters);

      const calledWith = proposalsService.findAllComplete.mock.calls[0][0];
      expect(calledWith.where).toMatchObject({ proposalId: "TEST123" });
      expect(calledWith.include).toEqual([
        { relation: "samples", scope: { limits: { limit: 5 } } },
      ]);
    });

    it("should handle undefined filters (no query param)", async () => {
      proposalsService.findAll.mockResolvedValue([]);
      await controller.findAll(mockAdminRequest, undefined);
      expect(proposalsService.findAll).toHaveBeenCalled();
    });
  });

  describe("updateFiltersForList", () => {
    it("should restrict to isPublished when user is not authenticated", () => {
      const result = controller.updateFiltersForList(
        { user: null } as unknown as Request,
        { where: {} },
      );
      expect(result.where?.isPublished).toBe(true);
    });

    it("should not restrict when admin can view all", () => {
      const request = {
        user: { currentGroups: ["admin"] },
      } as unknown as Request;

      const result = controller.updateFiltersForList(request, { where: {} });
      expect(result.where?.isPublished).toBeUndefined();
    });
  });

  describe("update", () => {
    it("should throw NotFoundException if proposal not found", async () => {
      proposalsService.findOne.mockResolvedValue(null);

      await expect(
        controller.update(
          {},
          "proposal-id",
          {},
          {} as PartialUpdateProposalDto,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw HttpException if headerDate <= proposal.updatedAt", async () => {
      const proposal = { updatedAt: new Date("2023-01-01") } as ProposalClass;
      proposalsService.findOne.mockResolvedValue(proposal);

      jest
        .spyOn(controller, "checkPermissionsForProposal")
        .mockResolvedValue(proposal);

      const headers = {
        "if-unmodified-since": "2022-12-31",
      };

      await expect(
        controller.update(
          {},
          "proposal-id",
          headers,
          {} as PartialUpdateProposalDto,
        ),
      ).rejects.toThrow(HttpException);
    });

    it("should call update and return updated proposal", async () => {
      const proposal = { updatedAt: new Date("2022-12-31") } as ProposalClass;
      const updatedProposal = {
        ...proposal,
        title: "Updated",
      } as ProposalClass;

      proposalsService.findOne.mockResolvedValue(proposal);
      proposalsService.update.mockResolvedValue(updatedProposal);

      jest
        .spyOn(controller, "checkPermissionsForProposal")
        .mockResolvedValue(proposal);

      const headers = {
        "if-unmodified-since": "2023-01-01",
      };

      const result = await controller.update({}, "proposal-id", headers, {
        title: "Updated",
      });

      expect(result).toEqual(updatedProposal);
      expect(proposalsService.update).toHaveBeenCalledWith(
        { proposalId: "proposal-id" },
        { title: "Updated" },
      );
    });

    it("should proceed with update if header is missing", async () => {
      const proposal = { updatedAt: new Date("2023-01-01") } as ProposalClass;
      const updatedProposal = {
        ...proposal,
        title: "Updated",
      } as ProposalClass;

      proposalsService.findOne.mockResolvedValue(proposal);
      proposalsService.update.mockResolvedValue(updatedProposal);

      jest
        .spyOn(controller, "checkPermissionsForProposal")
        .mockResolvedValue(proposal);

      const headers = {}; // No 'if-unmodified-since'

      const result = await controller.update({}, "proposal-id", headers, {
        title: "Updated",
      });

      expect(result).toEqual(updatedProposal);
    });

    it("should proceed with update if header is invalid date string", async () => {
      const proposal = { updatedAt: new Date("2023-01-01") } as ProposalClass;
      const updatedProposal = {
        ...proposal,
        title: "Updated",
      } as ProposalClass;

      proposalsService.findOne.mockResolvedValue(proposal);
      proposalsService.update.mockResolvedValue(updatedProposal);

      jest
        .spyOn(controller, "checkPermissionsForProposal")
        .mockResolvedValue(proposal);

      const headers = {
        "if-unmodified-since": "not-a-valid-date",
      };

      const result = await controller.update({}, "proposal-id", headers, {
        title: "Updated",
      });

      expect(result).toEqual(updatedProposal);
    });
  });
});
