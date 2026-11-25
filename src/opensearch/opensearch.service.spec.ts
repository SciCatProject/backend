import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { Logger } from "@nestjs/common";
import { OpensearchService } from "./opensearch.service";
import { SearchQueryService } from "./providers/query-builder.service";

import { DatasetsService } from "src/datasets/datasets.service";

class SearchQueryServiceMock {}
class DatasetsServiceMock {}

describe("OpensearchService", () => {
  let service: OpensearchService;

  const mockConfigService = {
    get: () => ({
      "opensearch.host": "fake",
      "opensearch.username": "fake",
      "opensearch.password": "fake",
      "opensearch.enabled": "yes",
      "opensearch.defaultIndex": "fake",
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OpensearchService,
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

    service = module.get<OpensearchService>(OpensearchService);
  });

  it("should properly load OpensearchService", () => {
    expect(service).toBeDefined();
  });

  it("should name missing settings in the warning without logging the password", () => {
    const warnSpy = jest.spyOn(Logger, "warn").mockImplementation();
    const values: Record<string, string> = {
      "opensearch.username": "admin",
      "opensearch.password": "super-secret",
      "opensearch.defaultIndex": "dataset",
    };
    new OpensearchService(
      new SearchQueryServiceMock() as SearchQueryService,
      { get: (key: string) => values[key] } as unknown as ConfigService,
    );

    expect(warnSpy).toHaveBeenCalledWith(
      "Missing Opensearch configuration: host",
      "Opensearch",
    );
    expect(JSON.stringify(warnSpy.mock.calls)).not.toContain("super-secret");
    warnSpy.mockRestore();
  });
});
