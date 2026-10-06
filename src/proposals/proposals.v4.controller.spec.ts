import { Test, TestingModule } from "@nestjs/testing";
import { ProposalsV4Controller } from "./proposals.v4.controller";
import { ProposalsService } from "./proposals.service";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Request } from "express";
import { ProposalClass } from "./schemas/proposal.schema";
import { CreateProposalV4Dto } from "./dto/create-proposal.v4.dto";
import {
  PartialUpdateProposalV4Dto,
  UpdateProposalV4Dto,
} from "./dto/update-proposal.dto";
import { Action } from "src/casl/action.enum";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { CountApiResponse, FullFacetResponse } from "src/common/types";
import { MongoError } from "mongodb";
import * as jmp from "json-merge-patch";
import {
  ConflictException,
  ForbiddenException,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import { ProposalLookupKeysEnumV4 } from "./types/proposal-lookup.v4";
import { IProposalFiltersV4 } from "./interfaces/proposal-filters.v4.interface";
import { IProposalFieldsV4 } from "./interfaces/proposal-fields.v4.interface";
import { ProposalDocument } from "./schemas/proposal.schema";

// Mock classes
class ProposalsServiceMock {
  createV4 = jest.fn();
  findAllCompleteV4 = jest.fn();
  findOneCompleteV4 = jest.fn();
  countV4 = jest.fn();
  fullfacetV4 = jest.fn();
  findOne = jest.fn();
  findOneAndUpdateV4 = jest.fn();
  findOneAndReplaceV4 = jest.fn();
  remove = jest.fn();
}

class CaslAbilityFactoryMock {
  proposalAccess = jest.fn();
}

// Test data
const mockAdminUser: JWTUser = {
  _id: "admin-id",
  username: "admin",
  email: "admin@test.com",
  currentGroups: ["admin"],
};

const mockRegularUser: JWTUser = {
  _id: "user-id",
  username: "user1",
  email: "user1@test.com",
  currentGroups: ["group1", "group2"],
};

const mockProposal: ProposalClass = {
  _id: "proposal-1-id",
  proposalId: "proposal-1",
  title: "Test Proposal",
  email: "test@email.com",
  firstname: "Test",
  lastname: "User",
  ownerGroup: "group1",
  accessGroups: ["group2"],
  isPublished: false,
  createdBy: "testuser",
  updatedBy: "testuser",
  createdAt: new Date("2024-01-01"),
  updatedAt: new Date("2024-01-01"),
  MeasurementPeriodList: [],
};

const mockPublishedProposal: ProposalClass = {
  ...mockProposal,
  _id: "proposal-2-id",
  proposalId: "proposal-2",
  isPublished: true,
};

// Valid CreateProposalV4Dto must include all required fields
// CreateProposalV4Dto extends UpdateProposalV4Dto which extends OwnableDto
// Required fields: proposalId (from CreateProposalV4Dto), email, title, ownerGroup (from OwnableDto)
const mockCreateProposalDto: CreateProposalV4Dto = {
  proposalId: "new-proposal",
  title: "New Proposal",
  email: "new@email.com",
  ownerGroup: "proposalingestor",
};

const mockRequest = (user: JWTUser): Partial<Request> => ({
  user: user,
  headers: {},
});

const mockRequestWithHeaders = (
  user: JWTUser,
  headers: Record<string, string> = {},
): Partial<Request> => ({
  user: user,
  headers: headers,
});

describe("ProposalsV4Controller", () => {
  let controller: ProposalsV4Controller;
  let proposalsService: ProposalsServiceMock;
  let caslAbilityFactory: CaslAbilityFactoryMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProposalsV4Controller],
      providers: [
        { provide: ProposalsService, useClass: ProposalsServiceMock },
        { provide: CaslAbilityFactory, useClass: CaslAbilityFactoryMock },
      ],
    }).compile();

    controller = module.get<ProposalsV4Controller>(ProposalsV4Controller);
    proposalsService = module.get(ProposalsService);
    caslAbilityFactory = module.get(CaslAbilityFactory);

    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  // ============================================================================
  // Helper method tests
  // ============================================================================

  describe("generateProposalInstanceForPermissions", () => {
    it("should create proposal instance from ProposalClass", async () => {
      const instance =
        await controller.generateProposalInstanceForPermissions(mockProposal);

      expect(instance).toBeInstanceOf(ProposalClass);
      expect(instance.proposalId).toBe(mockProposal.proposalId);
      expect(instance.ownerGroup).toBe(mockProposal.ownerGroup);
      expect(instance.accessGroups).toEqual(mockProposal.accessGroups);
      expect(instance.isPublished).toBe(mockProposal.isPublished);
    });

    it("should create proposal instance from CreateProposalV4Dto", async () => {
      const instance = await controller.generateProposalInstanceForPermissions(
        mockCreateProposalDto,
      );

      expect(instance).toBeInstanceOf(ProposalClass);
      expect(instance.proposalId).toBe(mockCreateProposalDto.proposalId);
      expect(instance.ownerGroup).toBe(mockCreateProposalDto.ownerGroup);
      expect(instance.accessGroups).toEqual([]);
      expect(instance.isPublished).toBe(false);
    });

    it("should handle partial proposal data", async () => {
      const partialProposal = {
        proposalId: "partial-proposal",
      } as unknown as CreateProposalV4Dto;

      const instance =
        await controller.generateProposalInstanceForPermissions(
          partialProposal,
        );

      expect(instance.proposalId).toBe("partial-proposal");
      expect(instance.ownerGroup).toBe("");
      expect(instance.accessGroups).toEqual([]);
    });
  });

  describe("checkPermissionsForProposalExtended", () => {
    it("should return proposal when permissions are valid", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);
      proposalsService.findOne.mockResolvedValue(mockProposal);

      const result = await controller.checkPermissionsForProposalExtended(
        mockRequest(mockAdminUser) as Request,
        "proposal-1",
        Action.ProposalRead,
      );

      expect(proposalsService.findOne).toHaveBeenCalledWith({
        proposalId: "proposal-1",
      });
      expect(result).toEqual(mockProposal);
    });

    it("should throw NotFoundException when proposal not found by ID", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);
      proposalsService.findOne.mockResolvedValue(null);

      await expect(
        controller.checkPermissionsForProposalExtended(
          mockRequest(mockAdminUser) as Request,
          "nonexistent",
          Action.ProposalRead,
        ),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user lacks permissions", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(false),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);
      proposalsService.findOne.mockResolvedValue(mockProposal);

      await expect(
        controller.checkPermissionsForProposalExtended(
          mockRequest(mockRegularUser) as Request,
          "proposal-1",
          Action.ProposalDelete,
        ),
      ).rejects.toThrow(ForbiddenException);
    });

    it("should work with CreateProposalV4Dto input", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const result = await controller.checkPermissionsForProposalExtended(
        mockRequest(mockAdminUser) as Request,
        mockCreateProposalDto,
        Action.ProposalCreate,
      );

      expect(result).toEqual(mockCreateProposalDto);
    });

    it("should throw NotFoundException when proposalInput is null", async () => {
      await expect(
        controller.checkPermissionsForProposalExtended(
          mockRequest(mockAdminUser) as Request,
          null,
          Action.ProposalRead,
        ),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("addAccessBasedFilters", () => {
    it("should not add filters for admin user", () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: { proposalId: "test" },
      };

      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const result = controller.addAccessBasedFilters(mockAdminUser, filter);

      expect(result).toEqual(filter);
      expect(result.where.$and).toBeUndefined();
    });

    it("should add access filters for regular user without existing $and", () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: { proposalId: "test" },
      };

      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return false;
          if (action === Action.ProposalRead) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const result = controller.addAccessBasedFilters(mockRegularUser, filter);

      expect(result.where.$and).toBeDefined();
      expect(result.where.$and).toHaveLength(1);
      expect(result.where.$and[0].$or).toEqual([
        { ownerGroup: { $in: mockRegularUser.currentGroups } },
        { accessGroups: { $in: mockRegularUser.currentGroups } },
        { sharedWith: { $in: [mockRegularUser.email] } },
        { isPublished: true },
      ]);
    });

    it("should add access filters for regular user with existing $and", () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: {
          $and: [{ proposalId: "test" }],
        },
      };

      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return false;
          if (action === Action.ProposalRead) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const result = controller.addAccessBasedFilters(mockRegularUser, filter);

      expect(result.where.$and).toHaveLength(2);
      expect(result.where.$and[1].$or).toEqual([
        { ownerGroup: { $in: mockRegularUser.currentGroups } },
        { accessGroups: { $in: mockRegularUser.currentGroups } },
        { sharedWith: { $in: [mockRegularUser.email] } },
        { isPublished: true },
      ]);
    });

    it("should throw ForbiddenException for unauthenticated user", () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: {},
      };

      // When user is null, caslAbilityFactory.proposalAccess might not be called
      // or it will throw. We need to test the actual behavior.
      // The controller should throw ForbiddenException when user is null
      expect(() => {
        controller.addAccessBasedFilters(null as unknown as JWTUser, filter);
      }).toThrow(ForbiddenException);
    });

    it("should not add filters when user can AccessAny", () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: { proposalId: "test" },
      };

      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const result = controller.addAccessBasedFilters(mockRegularUser, filter);

      expect(result).toEqual(filter);
      expect(result.where.$and).toBeUndefined();
    });
  });

  // ============================================================================
  // create method tests
  // ============================================================================

  describe("create", () => {
    it("should create a new proposal successfully", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const createdProposal = { ...mockProposal, ...mockCreateProposalDto };
      proposalsService.createV4.mockResolvedValue(createdProposal);

      const request = mockRequest(mockAdminUser) as Request;
      const result = await controller.create(request, mockCreateProposalDto);

      expect(proposalsService.createV4).toHaveBeenCalledWith(
        mockCreateProposalDto,
      );
      expect(result).toEqual(createdProposal);
    });

    it("should throw ConflictException on duplicate proposalId", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const mongoError = { code: 11000 } as MongoError;
      proposalsService.createV4.mockRejectedValue(mongoError);

      const request = mockRequest(mockAdminUser) as Request;

      await expect(
        controller.create(request, mockCreateProposalDto),
      ).rejects.toThrow(ConflictException);
    });

    it("should throw InternalServerErrorException on other errors", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const genericError = new Error("Database error");
      proposalsService.createV4.mockRejectedValue(genericError);

      const request = mockRequest(mockAdminUser) as Request;

      await expect(
        controller.create(request, mockCreateProposalDto),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it("should throw ForbiddenException when user lacks create permission", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(false),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const request = mockRequest(mockRegularUser) as Request;

      await expect(
        controller.create(request, mockCreateProposalDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // isValid method tests
  // ============================================================================

  describe("isValid", () => {
    it("should return valid: true for valid DTO", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const request = mockRequest(mockAdminUser) as Request;
      // Need to ensure the DTO is actually valid
      // mockCreateProposalDto has all required fields, so it should be valid
      const result = await controller.isValid(request, mockCreateProposalDto);

      // The validation might fail if required fields are missing
      // CreateProposalV4Dto extends UpdateProposalV4Dto which has required fields
      // We need to ensure our mock DTO has all required fields
      expect(result).toEqual({ valid: true });
    });

    it("should return valid: false for invalid DTO", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const invalidDto = { proposalId: "" } as unknown as CreateProposalV4Dto;

      const request = mockRequest(mockAdminUser) as Request;
      const result = await controller.isValid(request, invalidDto);

      expect(result).toEqual({ valid: false });
    });

    it("should throw ForbiddenException when user lacks create permission", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(false),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const request = mockRequest(mockRegularUser) as Request;

      await expect(
        controller.isValid(request, mockCreateProposalDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // findAll method tests
  // ============================================================================

  describe("findAll", () => {
    it("should return proposals without filter", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const proposals = [mockProposal, mockPublishedProposal];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const request = mockRequest(mockAdminUser) as Request;
      const result = await controller.findAll(request, undefined);

      expect(proposalsService.findAllCompleteV4).toHaveBeenCalledWith({});
      expect(result).toEqual(proposals);
    });

    it("should apply where filter", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const proposals = [mockProposal];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const request = mockRequest(mockAdminUser) as Request;
      const filter = JSON.stringify({ where: { proposalId: "proposal-1" } });
      const result = await controller.findAll(request, filter);

      expect(proposalsService.findAllCompleteV4).toHaveBeenCalled();
      expect(result).toEqual(proposals);
    });

    it("should apply pagination", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const proposals = [mockProposal];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const request = mockRequest(mockAdminUser) as Request;
      const filter = JSON.stringify({
        where: {},
        limits: { limit: 10, skip: 0 },
      });
      const result = await controller.findAll(request, filter);

      expect(proposalsService.findAllCompleteV4).toHaveBeenCalled();
      expect(result).toEqual(proposals);
    });

    it("should apply access-based filtering for regular user", async () => {
      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return false;
          if (action === Action.ProposalRead) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const proposals = [mockProposal];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const request = mockRequest(mockRegularUser) as Request;
      const filter = JSON.stringify({ where: { proposalId: "proposal-1" } });
      await controller.findAll(request, filter);

      // Verify the filter was modified with access constraints
      const calledWith = proposalsService.findAllCompleteV4.mock.calls[0][0];
      expect(calledWith.where.$and).toBeDefined();
      expect(calledWith.where.$and[0].$or).toBeDefined();
    });

    it("should handle empty filter string", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const proposals = [mockProposal];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const request = mockRequest(mockAdminUser) as Request;
      // Empty string becomes null after nullish coalescing, then JSON.parse("{}")
      const result = await controller.findAll(request, "");

      // When queryFilter is "", it becomes "{}" after ?? "{}", so parsed to {}
      expect(proposalsService.findAllCompleteV4).toHaveBeenCalledWith({});
      expect(result).toEqual(proposals);
    });
  });

  // ============================================================================
  // fullfacet method tests
  // ============================================================================

  describe("fullfacet", () => {
    it("should return fullfacet results", async () => {
      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const facets: FullFacetResponse[] = [
        { field: "type", values: [{ value: "test", count: 1 }] },
      ];
      proposalsService.fullfacetV4.mockResolvedValue(facets);

      const request = mockRequest(mockAdminUser) as Request;
      const filters = {
        facets: JSON.stringify(["type", "ownerGroup"]),
        fields: "{}",
      };
      const result = await controller.fullfacet(request, filters);

      expect(proposalsService.fullfacetV4).toHaveBeenCalled();
      expect(result).toEqual(facets);
    });

    it("should add userGroups to fields for regular user", async () => {
      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return false;
          if (action === Action.ProposalRead) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const facets: FullFacetResponse[] = [];
      proposalsService.fullfacetV4.mockResolvedValue(facets);

      const request = mockRequest(mockRegularUser) as Request;
      const filters = { facets: JSON.stringify(["type"]), fields: "{}" };
      await controller.fullfacet(request, filters);

      const calledWith = proposalsService.fullfacetV4.mock.calls[0][0];
      expect(calledWith.fields.userGroups).toBeDefined();
      expect(calledWith.fields.userGroups).toContain("group1");
      expect(calledWith.fields.userGroups).toContain("group2");
    });

    it("should handle empty filters", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const facets: FullFacetResponse[] = [];
      proposalsService.fullfacetV4.mockResolvedValue(facets);

      const request = mockRequest(mockAdminUser) as Request;
      const filters = {};
      const result = await controller.fullfacet(request, filters);

      expect(proposalsService.fullfacetV4).toHaveBeenCalledWith({
        fields: {},
        facets: [],
      });
      expect(result).toEqual(facets);
    });

    it("should throw ForbiddenException for unauthenticated user", async () => {
      const request = { user: null } as unknown as Request;

      await expect(controller.fullfacet(request, {})).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  // ============================================================================
  // findOne method tests
  // ============================================================================

  describe("findOne", () => {
    it("should return first matching proposal", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(mockProposal);

      const request = mockRequest(mockAdminUser) as Request;
      const filter = JSON.stringify({ where: { proposalId: "proposal-1" } });
      const result = await controller.findOne(request, filter);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalled();
      expect(result).toEqual(mockProposal);
    });

    it("should return null when no proposal found", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(null);

      const request = mockRequest(mockAdminUser) as Request;
      const filter = JSON.stringify({ where: { proposalId: "nonexistent" } });
      const result = await controller.findOne(request, filter);

      expect(result).toBeNull();
    });

    it("should apply access-based filtering", async () => {
      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return false;
          if (action === Action.ProposalRead) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(mockProposal);

      const request = mockRequest(mockRegularUser) as Request;
      const filter = JSON.stringify({ where: { proposalId: "proposal-1" } });
      await controller.findOne(request, filter);

      const calledWith = proposalsService.findOneCompleteV4.mock.calls[0][0];
      expect(calledWith.where.$and).toBeDefined();
    });

    it("should handle filter with include", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(mockProposal);

      const request = mockRequest(mockAdminUser) as Request;
      const filter = JSON.stringify({
        where: { proposalId: "proposal-1" },
        include: [ProposalLookupKeysEnumV4.samples],
      });
      await controller.findOne(request, filter);

      const calledWith = proposalsService.findOneCompleteV4.mock.calls[0][0];
      expect(calledWith.include).toContain(ProposalLookupKeysEnumV4.samples);
    });
  });

  // ============================================================================
  // count method tests
  // ============================================================================

  describe("count", () => {
    it("should return count without filter", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const countResponse: CountApiResponse = { count: 5 };
      proposalsService.countV4.mockResolvedValue(countResponse);

      const request = mockRequest(mockAdminUser) as Request;
      const result = await controller.count(request, undefined);

      expect(proposalsService.countV4).toHaveBeenCalledWith({});
      expect(result).toEqual(countResponse);
    });

    it("should return count with where filter", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const countResponse: CountApiResponse = { count: 1 };
      proposalsService.countV4.mockResolvedValue(countResponse);

      const request = mockRequest(mockAdminUser) as Request;
      const filter = JSON.stringify({ where: { ownerGroup: "group1" } });
      const result = await controller.count(request, filter);

      expect(proposalsService.countV4).toHaveBeenCalled();
      expect(result).toEqual(countResponse);
    });

    it("should apply access-based filtering", async () => {
      const abilityMock = {
        can: jest.fn((action) => {
          if (action === Action.AccessAny) return false;
          if (action === Action.ProposalRead) return true;
          return false;
        }),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const countResponse: CountApiResponse = { count: 1 };
      proposalsService.countV4.mockResolvedValue(countResponse);

      const request = mockRequest(mockRegularUser) as Request;
      const filter = JSON.stringify({ where: {} });
      await controller.count(request, filter);

      const calledWith = proposalsService.countV4.mock.calls[0][0];
      expect(calledWith.where.$and).toBeDefined();
    });
  });

  // ============================================================================
  // findById method tests
  // ============================================================================

  describe("findById", () => {
    it("should return proposal by ID", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(mockProposal);

      const request = mockRequest(mockAdminUser) as Request;
      const result = await controller.findById(
        request,
        "proposal-1",
        undefined,
      );

      // When include is undefined, the controller converts it using:
      // const includeArray = Array.isArray(include) ? include : include && Array(include);
      // So undefined becomes undefined, not []
      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: "proposal-1" },
        include: undefined,
      });
      expect(result).toEqual(mockProposal);
    });

    it("should apply include relations", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(mockProposal);

      const request = mockRequest(mockAdminUser) as Request;
      await controller.findById(
        request,
        "proposal-1",
        ProposalLookupKeysEnumV4.samples,
      );

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: "proposal-1" },
        include: [ProposalLookupKeysEnumV4.samples],
      });
    });

    it("should handle array of include relations", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(mockProposal);

      const request = mockRequest(mockAdminUser) as Request;
      await controller.findById(request, "proposal-1", [
        ProposalLookupKeysEnumV4.samples,
      ]);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: "proposal-1" },
        include: [ProposalLookupKeysEnumV4.samples],
      });
    });

    it("should throw NotFoundException when proposal not found", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(null);

      const request = mockRequest(mockAdminUser) as Request;

      await expect(
        controller.findById(request, "nonexistent", undefined),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user lacks read permission", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(false),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOneCompleteV4.mockResolvedValue(mockProposal);

      const request = mockRequest(mockRegularUser) as Request;

      await expect(
        controller.findById(request, "proposal-1", undefined),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // findByIdAndUpdate (PATCH) method tests
  // ============================================================================

  describe("findByIdAndUpdate", () => {
    it("should update proposal with PATCH", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const updateDto: PartialUpdateProposalV4Dto = { title: "Updated Title" };
      const updatedProposal = { ...mockProposal, title: "Updated Title" };

      proposalsService.findOne.mockResolvedValue(mockProposal);
      proposalsService.findOneAndUpdateV4.mockResolvedValue(updatedProposal);

      const request = mockRequest(mockAdminUser) as Request;
      const result = await controller.findByIdAndUpdate(
        request,
        "proposal-1",
        updateDto,
      );

      expect(proposalsService.findOne).toHaveBeenCalledWith({
        where: { proposalId: "proposal-1" },
      });
      expect(proposalsService.findOneAndUpdateV4).toHaveBeenCalledWith(
        { proposalId: "proposal-1" },
        updateDto,
        undefined,
      );
      expect(result).toEqual(updatedProposal);
    });

    it("should handle merge-patch content-type", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const updateDto: PartialUpdateProposalV4Dto = { title: "Updated Title" };
      const updatedProposal = { ...mockProposal, title: "Updated Title" };

      proposalsService.findOne.mockResolvedValue(mockProposal);
      proposalsService.findOneAndUpdateV4.mockResolvedValue(updatedProposal);

      const request = mockRequestWithHeaders(mockAdminUser, {
        "content-type": "application/merge-patch+json",
      }) as Request;
      await controller.findByIdAndUpdate(request, "proposal-1", updateDto);

      const expectedUpdate = jmp.apply(mockProposal, updateDto);
      expect(proposalsService.findOneAndUpdateV4).toHaveBeenCalledWith(
        { proposalId: "proposal-1" },
        expectedUpdate,
        undefined,
      );
    });

    it("should handle if-unmodified-since header", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const updateDto: PartialUpdateProposalV4Dto = { title: "Updated Title" };
      const updatedProposal = { ...mockProposal, title: "Updated Title" };

      proposalsService.findOne.mockResolvedValue(mockProposal);
      proposalsService.findOneAndUpdateV4.mockResolvedValue(updatedProposal);

      const request = mockRequestWithHeaders(mockAdminUser, {
        "if-unmodified-since": "2024-01-01T00:00:00.000Z",
      }) as Request;
      await controller.findByIdAndUpdate(request, "proposal-1", updateDto);

      expect(proposalsService.findOneAndUpdateV4).toHaveBeenCalledWith(
        { proposalId: "proposal-1" },
        updateDto,
        new Date("2024-01-01T00:00:00.000Z"),
      );
    });

    it("should throw NotFoundException when proposal not found", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOne.mockResolvedValue(null);

      const request = mockRequest(mockAdminUser) as Request;
      const updateDto: PartialUpdateProposalV4Dto = { title: "Updated Title" };

      await expect(
        controller.findByIdAndUpdate(request, "nonexistent", updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user lacks update permission", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(false),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOne.mockResolvedValue(mockProposal);

      const request = mockRequest(mockRegularUser) as Request;
      const updateDto: PartialUpdateProposalV4Dto = { title: "Updated Title" };

      await expect(
        controller.findByIdAndUpdate(request, "proposal-1", updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // findByIdAndReplace (PUT) method tests
  // ============================================================================

  describe("findByIdAndReplace", () => {
    it("should replace proposal with PUT", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      const updateDto: UpdateProposalV4Dto = {
        ...mockCreateProposalDto,
        title: "Replaced Title",
      };
      const replacedProposal = { ...mockProposal, ...updateDto };

      proposalsService.findOne.mockResolvedValue(mockProposal);
      proposalsService.findOneAndReplaceV4.mockResolvedValue(replacedProposal);

      const request = mockRequest(mockAdminUser) as Request;
      const result = await controller.findByIdAndReplace(
        request,
        "proposal-1",
        updateDto,
      );

      expect(proposalsService.findOne).toHaveBeenCalledWith({
        where: { proposalId: "proposal-1" },
      });
      expect(proposalsService.findOneAndReplaceV4).toHaveBeenCalledWith(
        { proposalId: "proposal-1" },
        updateDto,
      );
      expect(result).toEqual(replacedProposal);
    });

    it("should throw NotFoundException when proposal not found", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOne.mockResolvedValue(null);

      const request = mockRequest(mockAdminUser) as Request;
      const updateDto: UpdateProposalV4Dto = { ...mockCreateProposalDto };

      await expect(
        controller.findByIdAndReplace(request, "nonexistent", updateDto),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user lacks update permission", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(false),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOne.mockResolvedValue(mockProposal);

      const request = mockRequest(mockRegularUser) as Request;
      const updateDto: UpdateProposalV4Dto = { ...mockCreateProposalDto };

      await expect(
        controller.findByIdAndReplace(request, "proposal-1", updateDto),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  // ============================================================================
  // findByIdAndDelete method tests
  // ============================================================================

  describe("findByIdAndDelete", () => {
    it("should delete proposal", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOne.mockResolvedValue(mockProposal);
      proposalsService.remove.mockResolvedValue(mockProposal);

      const request = mockRequest(mockAdminUser) as Request;
      const result = await controller.findByIdAndDelete(request, "proposal-1");

      expect(proposalsService.findOne).toHaveBeenCalledWith({
        proposalId: "proposal-1",
      });
      expect(proposalsService.remove).toHaveBeenCalledWith({
        proposalId: "proposal-1",
      });
      expect(result).toEqual(mockProposal);
    });

    it("should throw NotFoundException when proposal not found", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(true),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOne.mockResolvedValue(null);

      const request = mockRequest(mockAdminUser) as Request;

      await expect(
        controller.findByIdAndDelete(request, "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw ForbiddenException when user lacks delete permission", async () => {
      const abilityMock = {
        can: jest.fn().mockReturnValue(false),
      };
      caslAbilityFactory.proposalAccess.mockReturnValue(abilityMock);

      proposalsService.findOne.mockResolvedValue(mockProposal);

      const request = mockRequest(mockRegularUser) as Request;

      await expect(
        controller.findByIdAndDelete(request, "proposal-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
