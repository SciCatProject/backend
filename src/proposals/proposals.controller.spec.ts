import { Test, TestingModule } from "@nestjs/testing";
import { AttachmentsService } from "src/attachments/attachments.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { DatasetsService } from "src/datasets/datasets.service";
import { ProposalsController } from "./proposals.controller";
import { ProposalsService } from "./proposals.service";
import { NotFoundException, PreconditionFailedException } from "@nestjs/common";
import { PartialUpdateProposalDto } from "./dto/update-proposal.dto";
import { ProposalClass } from "./schemas/proposal.schema";

class AttachmentsServiceMock {}

class DatasetsServiceMock {}

class ProposalsServiceMock {
  findOne = jest.fn();
  findOneAndUpdate = jest.fn();
}

class CaslAbilityFactoryMock {}

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

    it("should throw PreconditionFailedException if proposals service throws it", async () => {
      const proposal = { updatedAt: new Date("2023-01-01") } as ProposalClass;
      proposalsService.findOne.mockResolvedValue(proposal);
      proposalsService.findOneAndUpdate.mockRejectedValue(
        new PreconditionFailedException(
          "Proposal has been modified on server since the provided timestamp",
        ),
      ); // Simulate precondition failed

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
      ).rejects.toThrow(PreconditionFailedException);

      expect(proposalsService.findOneAndUpdate).toHaveBeenCalledWith(
        { proposalId: "proposal-id" },
        expect.anything(),
        new Date("2022-12-31"),
      );
    });

    it("should call update and return updated proposal", async () => {
      const proposal = { updatedAt: new Date("2022-12-31") } as ProposalClass;
      const updatedProposal = {
        ...proposal,
        title: "Updated",
      } as ProposalClass;

      proposalsService.findOne.mockResolvedValue(proposal);
      proposalsService.findOneAndUpdate.mockResolvedValue(updatedProposal);

      jest
        .spyOn(controller, "checkPermissionsForProposal")
        .mockResolvedValue(proposal);

      const result = await controller.update(
        {},
        "proposal-id",
        {},
        {
          title: "Updated",
        },
      );

      expect(result).toEqual(updatedProposal);
      expect(proposalsService.findOneAndUpdate).toHaveBeenCalledWith(
        { proposalId: "proposal-id" },
        { title: "Updated" },
        undefined,
      );
    });

    it("should proceed with update if header is missing", async () => {
      const proposal = { updatedAt: new Date("2023-01-01") } as ProposalClass;
      const updatedProposal = {
        ...proposal,
        title: "Updated",
      } as ProposalClass;

      proposalsService.findOne.mockResolvedValue(proposal);
      proposalsService.findOneAndUpdate.mockResolvedValue(updatedProposal);

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
      proposalsService.findOneAndUpdate.mockResolvedValue(updatedProposal);

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
