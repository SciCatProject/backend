import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { ElasticSearchService } from "./elastic-search.service";
import { SearchQueryService } from "./providers/query-builder.service";

import { DatasetsService } from "src/datasets/datasets.service";

class SearchQueryServiceMock {}
class DatasetsServiceMock {}

describe("ElasticSearchService", () => {
  let service: ElasticSearchService;

  const mockConfigService = {
    get: () => ({
      "elasticSearch.host": "fake",
      "elasticSearch.username": "fake",
      "elasticSearch.password": "fake",
      "elasticSearch.enabled": "yes",
      "elasticSearch.defaultIndex": "fake",
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ElasticSearchService,
        {
          provide: ConfigService,
          useValue: mockConfigService,
        },
        {
          provide: SearchQueryService,
          useClass: SearchQueryServiceMock,
        },
        { provide: DatasetsService, useClass: DatasetsServiceMock },
      ],
    }).compile();

    service = module.get<ElasticSearchService>(ElasticSearchService);
  });

  it("should properly load ElasticSearchService", () => {
    expect(service).toBeDefined();
  });
});
