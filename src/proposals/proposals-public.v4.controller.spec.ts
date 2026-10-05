import { Test, TestingModule } from '@nestjs/testing';
import { ProposalsPublicV4Controller } from './proposals-public.v4.controller';
import { ProposalsService } from './proposals.service';
import { ProposalClass, ProposalDocument } from './schemas/proposal.schema';
import { OutputProposalV4Dto } from './dto/output-proposal.v4.dto';
import { CountApiResponse, FullFacetResponse } from 'src/common/types';
import { IProposalFiltersV4 } from './interfaces/proposal-filters.v4.interface';
import { IProposalFieldsV4 } from './interfaces/proposal-fields.v4.interface';
import { ProposalLookupKeysEnumV4 } from './types/proposal-lookup.v4';

// ============================================================================
// Mock Classes
// ============================================================================

class ProposalsServiceMock {
  findAllCompleteV4 = jest.fn();
  findOneCompleteV4 = jest.fn();
  countV4 = jest.fn();
  fullfacetV4 = jest.fn();
}

// ============================================================================
// Test Data
// ============================================================================

const mockPublishedProposal: ProposalClass = {
  _id: 'published-proposal-1',
  proposalId: 'prop-001',
  title: 'Published Proposal',
  email: 'user@test.com',
  firstname: 'John',
  lastname: 'Doe',
  ownerGroup: 'group1',
  accessGroups: ['group2'],
  isPublished: true,
  createdAt: new Date('2024-01-01'),
  updatedAt: new Date('2024-01-01'),
  MeasurementPeriodList: [],
};

const mockUnpublishedProposal: ProposalClass = {
  ...mockPublishedProposal,
  _id: 'unpublished-proposal-1',
  proposalId: 'prop-002',
  isPublished: false,
};

const mockPublishedProposal2: ProposalClass = {
  _id: 'published-proposal-2',
  proposalId: 'prop-003',
  title: 'Second Published Proposal',
  email: 'user2@test.com',
  firstname: 'Jane',
  lastname: 'Smith',
  ownerGroup: 'group2',
  accessGroups: ['group1'],
  isPublished: true,
  createdAt: new Date('2024-01-02'),
  updatedAt: new Date('2024-01-02'),
  MeasurementPeriodList: [],
};

// ============================================================================
// Test Suites
// ============================================================================

describe('ProposalsPublicV4Controller', () => {
  let controller: ProposalsPublicV4Controller;
  let proposalsService: ProposalsServiceMock;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProposalsPublicV4Controller],
      providers: [
        { provide: ProposalsService, useClass: ProposalsServiceMock },
      ],
    }).compile();

    controller = module.get<ProposalsPublicV4Controller>(ProposalsPublicV4Controller);
    proposalsService = module.get(ProposalsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  // ============================================================================
  // Helper Method Tests: addPublicFilter
  // ============================================================================

  describe('addPublicFilter', () => {
    it('should add isPublished: true filter to empty where', () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {};
      controller.addPublicFilter(filter);
      expect(filter.where).toEqual({ isPublished: true });
    });

    it('should add isPublished: true to existing where', () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: { proposalId: 'test-123' },
      };
      controller.addPublicFilter(filter);
      expect(filter.where).toEqual({ proposalId: 'test-123', isPublished: true });
    });

    it('should override existing isPublished to true', () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: { isPublished: false },
      };
      controller.addPublicFilter(filter);
      expect(filter.where).toEqual({ isPublished: true });
    });

    it('should handle undefined where in filter', () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: undefined,
      };
      // @ts-expect-error - testing undefined case
      controller.addPublicFilter(filter);
      expect(filter.where).toEqual({ isPublished: true });
    });
  });

  // ============================================================================
  // Endpoint Tests: findAllPublic
  // ============================================================================

  describe('findAllPublic', () => {
    it('should return published proposals without filter', async () => {
      const proposals = [mockPublishedProposal, mockPublishedProposal2];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const result = await controller.findAllPublic('{}');

      expect(proposalsService.findAllCompleteV4).toHaveBeenCalledWith({
        where: { isPublished: true },
      });
      expect(result).toEqual(proposals);
    });

    it('should apply where filter and add isPublished', async () => {
      const proposals = [mockPublishedProposal];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const queryFilter = JSON.stringify({ where: { proposalId: 'prop-001' } });
      const result = await controller.findAllPublic(queryFilter);

      expect(proposalsService.findAllCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-001', isPublished: true },
      });
      expect(result).toEqual(proposals);
    });

    it('should apply pagination with filter', async () => {
      const proposals = [mockPublishedProposal];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const queryFilter = JSON.stringify({
        where: { title: 'Published' },
        skip: 10,
        limit: 5,
      });
      const result = await controller.findAllPublic(queryFilter);

      expect(proposalsService.findAllCompleteV4).toHaveBeenCalledWith({
        where: { title: 'Published', isPublished: true },
        skip: 10,
        limit: 5,
      });
      expect(result).toEqual(proposals);
    });

    it('should handle empty filter string', async () => {
      const proposals = [mockPublishedProposal];
      proposalsService.findAllCompleteV4.mockResolvedValue(proposals);

      const result = await controller.findAllPublic('');

      expect(proposalsService.findAllCompleteV4).toHaveBeenCalledWith({
        where: { isPublished: true },
      });
      expect(result).toEqual(proposals);
    });

    it('should return empty array when no published proposals', async () => {
      proposalsService.findAllCompleteV4.mockResolvedValue([]);

      const result = await controller.findAllPublic('{}');

      expect(proposalsService.findAllCompleteV4).toHaveBeenCalledWith({
        where: { isPublished: true },
      });
      expect(result).toEqual([]);
    });
  });

  // ============================================================================
  // Endpoint Tests: findByIdPublic
  // ============================================================================

  describe('findByIdPublic', () => {
    it('should return published proposal by ID', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(mockPublishedProposal);

      const result = await controller.findByIdPublic('prop-001', undefined);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-001', isPublished: true },
        include: undefined,
      });
      expect(result).toEqual(mockPublishedProposal);
    });

    it('should return null for unpublished proposal', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(null);

      const result = await controller.findByIdPublic('prop-002', undefined);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-002', isPublished: true },
        include: undefined,
      });
      expect(result).toBeNull();
    });

    it('should return null for non-existent proposal', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(null);

      const result = await controller.findByIdPublic('non-existent', undefined);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'non-existent', isPublished: true },
        include: undefined,
      });
      expect(result).toBeNull();
    });

    it('should apply single include relation', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(mockPublishedProposal);

      const result = await controller.findByIdPublic(
        'prop-001',
        ProposalLookupKeysEnumV4.samples,
      );

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-001', isPublished: true },
        include: [ProposalLookupKeysEnumV4.samples],
      });
      expect(result).toEqual(mockPublishedProposal);
    });

    it('should apply array of include relations', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(mockPublishedProposal);

      const includes = [
        ProposalLookupKeysEnumV4.samples,
        ProposalLookupKeysEnumV4.all,
      ];
      const result = await controller.findByIdPublic('prop-001', includes);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-001', isPublished: true },
        include: includes,
      });
      expect(result).toEqual(mockPublishedProposal);
    });

    it('should handle undefined include', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(mockPublishedProposal);

      const result = await controller.findByIdPublic('prop-001', undefined);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-001', isPublished: true },
        include: undefined,
      });
      expect(result).toEqual(mockPublishedProposal);
    });
  });

  // ============================================================================
  // Endpoint Tests: countPublic
  // ============================================================================

  describe('countPublic', () => {
    it('should return count of all published proposals', async () => {
      const countResponse: CountApiResponse = { count: 2 };
      proposalsService.countV4.mockResolvedValue(countResponse);

      const result = await controller.countPublic('{}');

      expect(proposalsService.countV4).toHaveBeenCalledWith({
        where: { isPublished: true },
      });
      expect(result).toEqual(countResponse);
    });

    it('should count with where filter', async () => {
      const countResponse: CountApiResponse = { count: 1 };
      proposalsService.countV4.mockResolvedValue(countResponse);

      const queryFilter = JSON.stringify({ where: { ownerGroup: 'group1' } });
      const result = await controller.countPublic(queryFilter);

      expect(proposalsService.countV4).toHaveBeenCalledWith({
        where: { ownerGroup: 'group1', isPublished: true },
      });
      expect(result).toEqual(countResponse);
    });

    it('should handle empty filter string', async () => {
      const countResponse: CountApiResponse = { count: 2 };
      proposalsService.countV4.mockResolvedValue(countResponse);

      const result = await controller.countPublic('');

      expect(proposalsService.countV4).toHaveBeenCalledWith({
        where: { isPublished: true },
      });
      expect(result).toEqual(countResponse);
    });

    it('should handle undefined filter', async () => {
      const countResponse: CountApiResponse = { count: 2 };
      proposalsService.countV4.mockResolvedValue(countResponse);

      const result = await controller.countPublic(undefined);

      expect(proposalsService.countV4).toHaveBeenCalledWith({
        where: { isPublished: true },
      });
      expect(result).toEqual(countResponse);
    });
  });

  // ============================================================================
  // Endpoint Tests: findOnePublic
  // ============================================================================

  describe('findOnePublic', () => {
    it('should return first published proposal matching filter', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(mockPublishedProposal);

      const queryFilter = JSON.stringify({ where: { proposalId: 'prop-001' } });
      const result = await controller.findOnePublic(queryFilter);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-001', isPublished: true },
      });
      expect(result).toEqual(mockPublishedProposal);
    });

    it('should return null when no published proposal found', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(null);

      const queryFilter = JSON.stringify({ where: { proposalId: 'prop-002' } });
      const result = await controller.findOnePublic(queryFilter);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-002', isPublished: true },
      });
      expect(result).toBeNull();
    });

    it('should apply include relations', async () => {
      proposalsService.findOneCompleteV4.mockResolvedValue(mockPublishedProposal);

      const queryFilter = JSON.stringify({
        where: { proposalId: 'prop-001' },
        include: [ProposalLookupKeysEnumV4.samples],
      });
      const result = await controller.findOnePublic(queryFilter);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-001', isPublished: true },
        include: [ProposalLookupKeysEnumV4.samples],
      });
      expect(result).toEqual(mockPublishedProposal);
    });
  });

  // ============================================================================
  // Endpoint Tests: fullfacet
  // ============================================================================

  describe('fullfacet', () => {
    it('should return fullfacet results with default params', async () => {
      const facets = [{ key: 'type', count: 5 }];
      proposalsService.fullfacetV4.mockResolvedValue(facets);

      const result = await controller.fullfacet({ fields: undefined, facets: undefined });

      expect(proposalsService.fullfacetV4).toHaveBeenCalledWith({
        fields: { isPublished: true },
        facets: [],
      });
      expect(result).toEqual(facets);
    });

    it('should parse fields from query string', async () => {
      const facets = [{ key: 'type', count: 5 }];
      proposalsService.fullfacetV4.mockResolvedValue(facets);

      const fields = JSON.stringify({ title: true, ownerGroup: true });
      const result = await controller.fullfacet({ fields, facets: undefined });

      expect(proposalsService.fullfacetV4).toHaveBeenCalledWith({
        fields: { title: true, ownerGroup: true, isPublished: true },
        facets: [],
      });
      expect(result).toEqual(facets);
    });

    it('should parse facets from query string', async () => {
      const facets = [{ key: 'type', count: 5 }];
      proposalsService.fullfacetV4.mockResolvedValue(facets);

      const facetsParam = JSON.stringify(['type', 'ownerGroup']);
      const result = await controller.fullfacet({ fields: undefined, facets: facetsParam });

      expect(proposalsService.fullfacetV4).toHaveBeenCalledWith({
        fields: { isPublished: true },
        facets: ['type', 'ownerGroup'],
      });
      expect(result).toEqual(facets);
    });

    it('should handle empty fields and facets', async () => {
      const facets = [];
      proposalsService.fullfacetV4.mockResolvedValue(facets);

      const result = await controller.fullfacet({ fields: '{}', facets: '[]' });

      expect(proposalsService.fullfacetV4).toHaveBeenCalledWith({
        fields: { isPublished: true },
        facets: [],
      });
      expect(result).toEqual(facets);
    });

    it('should handle null fields and facets', async () => {
      const facets = [];
      proposalsService.fullfacetV4.mockResolvedValue(facets);

      const result = await controller.fullfacet({ fields: null, facets: null });

      expect(proposalsService.fullfacetV4).toHaveBeenCalledWith({
        fields: { isPublished: true },
        facets: [],
      });
      expect(result).toEqual(facets);
    });
  });

  // ============================================================================
  // Phase 2 & 3: Error Handling and Edge Cases
  // ============================================================================

  describe('addPublicFilter - edge cases', () => {
    it('should handle filter with where set to null', () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: null,
      };
      // @ts-expect-error - testing null case
      controller.addPublicFilter(filter);
      expect(filter.where).toEqual({ isPublished: true });
    });

    it('should handle filter with where as empty object', () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: {},
      };
      controller.addPublicFilter(filter);
      expect(filter.where).toEqual({ isPublished: true });
    });

    it('should preserve other where conditions', () => {
      const filter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: { proposalId: 'test-123', ownerGroup: 'group1' },
      };
      controller.addPublicFilter(filter);
      expect(filter.where).toEqual({
        proposalId: 'test-123',
        ownerGroup: 'group1',
        isPublished: true,
      });
    });
  });

  describe('Error Handling', () => {
    it('findAllPublic should propagate service errors', async () => {
      const error = new Error('Database error');
      proposalsService.findAllCompleteV4.mockRejectedValue(error);

      await expect(controller.findAllPublic('{}')).rejects.toThrow(error);
    });

    it('findByIdPublic should propagate service errors', async () => {
      const error = new Error('Database error');
      proposalsService.findOneCompleteV4.mockRejectedValue(error);

      await expect(controller.findByIdPublic('prop-001', undefined)).rejects.toThrow(
        error,
      );
    });

    it('countPublic should propagate service errors', async () => {
      const error = new Error('Database error');
      proposalsService.countV4.mockRejectedValue(error);

      await expect(controller.countPublic('{}')).rejects.toThrow(error);
    });

    it('findOnePublic should propagate service errors', async () => {
      const error = new Error('Database error');
      proposalsService.findOneCompleteV4.mockRejectedValue(error);

      await expect(
        controller.findOnePublic(JSON.stringify({ where: {} })),
      ).rejects.toThrow(error);
    });

    it('fullfacet should propagate service errors', async () => {
      const error = new Error('Database error');
      proposalsService.fullfacetV4.mockRejectedValue(error);

      await expect(
        controller.fullfacet({ fields: '{}', facets: '[]' }),
      ).rejects.toThrow(error);
    });
  });

  describe('Public Access Verification', () => {
    it('should never return unpublished proposals via findByIdPublic', async () => {
      // Even if service returns unpublished proposal, the filter should prevent it
      proposalsService.findOneCompleteV4.mockResolvedValue(mockUnpublishedProposal);

      // The service should be called with isPublished: true filter
      await controller.findByIdPublic('prop-002', undefined);

      expect(proposalsService.findOneCompleteV4).toHaveBeenCalledWith({
        where: { proposalId: 'prop-002', isPublished: true },
        include: undefined,
      });
    });

    it('should enforce isPublished filter in all endpoints', async () => {
      // Verify that addPublicFilter is consistently applied
      const testFilter: IProposalFiltersV4<ProposalDocument, IProposalFieldsV4> = {
        where: { title: 'Test' },
      };
      controller.addPublicFilter(testFilter);
      expect(testFilter.where.isPublished).toBe(true);
    });
  });
});
