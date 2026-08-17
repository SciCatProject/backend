import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { Client } from "@opensearch-project/opensearch";

import {
  SearchMode,
  SearchQueryService,
} from "./providers/query-builder.service";

import {
  DatasetClass,
  DatasetDocument,
} from "src/datasets/schemas/dataset.schema";
import { ConfigService } from "@nestjs/config";
import { sleep } from "src/common/utils";

import type { IndexSettings } from "@opensearch-project/opensearch/api/_types/indices._common.js";
import { ISearchFilter } from "./interfaces/os-common.type";
import { CreateIndexDto } from "./dto/create-index.dto";
import { UpdateIndexDto } from "./dto/update-index.dto";
import type { TypeMapping } from "@opensearch-project/opensearch/api/_types/_common.mapping.js";
import { Readable } from "stream";
import { BulkStats } from "@opensearch-project/opensearch/lib/Helpers.js";
import { Sort } from "@opensearch-project/opensearch/api/_types/_common.js";

export interface SearchParams {
  filter: ISearchFilter;
  index?: string;
  limit?: number;
  skip?: number;
  sort?: Record<string, "asc" | "desc">[];
}

type OsSearchResponseBody = {
  hits: {
    total?: number | { value: number };
    hits: { _id: string }[];
  };
};

export interface SearchResult {
  totalCount: number;
  hits: string[];
}

@Injectable()
export class OpensearchService implements OnModuleInit {
  private osClient: Client;
  private host: string;
  private username: string;
  private password: string;
  private refresh: "false" | "wait_for";
  private osConfigs: {
    settings: IndexSettings;
    mappings: TypeMapping;
  } | null;
  private maxResultWindow: number;

  public defaultIndex: string;

  constructor(
    private readonly searchService: SearchQueryService,
    private readonly configService: ConfigService,
  ) {
    this.host = this.configService.get<string>("opensearch.host") || "";
    this.username = this.configService.get<string>("opensearch.username") || "";
    this.password = this.configService.get<string>("opensearch.password") || "";

    this.refresh =
      this.configService.get<"false" | "wait_for">("opensearch.refresh") ||
      "false";

    this.defaultIndex =
      this.configService.get<string>("opensearch.defaultIndex") || "dataset";

    this.osConfigs =
      this.configService.get<{
        settings: IndexSettings;
        mappings: TypeMapping;
      }>("opensearchConfig") || null;
    this.maxResultWindow = Number(
      this.osConfigs?.settings?.index?.max_result_window || 10000,
    );
    if (!this.host || !this.username || !this.password || !this.defaultIndex) {
      Logger.warn(
        `Missing Opensearch configuration for host: ${this.host}, username: ${this.username}, 
        password: ${this.password} or defaultIndex: ${this.defaultIndex}`,
        "Opensearch",
      );
    }
    if (!this.osConfigs) {
      Logger.warn(
        `Missing Opensearch index configuration, using default settings and mappings`,
        "Opensearch",
      );
    }
  }

  onModuleInit() {
    this.initWithRetry();
  }

  private async connect() {
    const connection = new Client({
      node: this.host,
      auth: {
        username: this.username,
        password: this.password,
      },
      ssl: {
        rejectUnauthorized: false,
      },
    });

    await connection.ping();

    this.osClient = connection;
  }
  private async initWithRetry(
    maxRetries = 10,
    initialDelayMs = 5000,
    maxDelayMs = 60000,
  ) {
    let delayMs = initialDelayMs;
    let retryCount = 0;

    while (retryCount < maxRetries) {
      try {
        await this.connect();

        const isIndexExists = await this.isIndexExists(this.defaultIndex);
        if (!isIndexExists) {
          await this.createIndex({
            index: this.defaultIndex,
            settings: this.osConfigs?.settings || {},
            mappings: this.osConfigs?.mappings || {},
          });
          Logger.log(`New index ${this.defaultIndex} is created`, "Opensearch");
        }

        Logger.log("Opensearch Connected", "Opensearch");
        return;
      } catch (error) {
        retryCount++;
        Logger.warn(
          `Opensearch connection failed (attempt ${retryCount}/${maxRetries}), retrying in ${delayMs / 1000}s...`,
          error,
        );
        await sleep(delayMs);
        delayMs = Math.min(delayMs * 2, maxDelayMs);
      }
    }

    Logger.error(
      `Opensearch failed to connect after ${maxRetries} attempts, running without it`,
      "Opensearch",
    );
  }

  connected() {
    return !!this.osClient;
  }

  async isIndexExists(index = this.defaultIndex) {
    const { body: indexExists } = await this.osClient.indices.exists({ index });
    return indexExists;
  }

  async isPopulated(index = this.defaultIndex) {
    const { body } = await this.getCount(index);

    if (body.count > 0) {
      return true;
    }
    Logger.error(
      `Opensearch is enabled but index ${index} is empty, please sync the data from MongoDB to Opensearch using the /sync-database endpoint`,
      "Opensearch",
    );

    return false;
  }

  async createIndex(createIndexDto: CreateIndexDto) {
    const index = createIndexDto.index.trim();
    const { settings, mappings } = createIndexDto;

    try {
      const newIndex = await this.osClient.indices.create({
        index,
        body: {
          settings: settings || this.osConfigs?.settings,
          mappings: mappings || this.osConfigs?.mappings,
        },
      });
      Logger.log(`Opensearch Index Created-> Index: ${index}`, "Opensearch");

      return newIndex;
    } catch (error) {
      throw new HttpException(
        `createIndex failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  async syncDatabase(collection: DatasetClass[], index = this.defaultIndex) {
    const indexExists = await this.osClient.indices.exists({ index });
    if (!indexExists) {
      throw new Error("Index not found");
    }

    const bulkResponse = await this.performBulkOperation(collection, index);

    Logger.log(
      JSON.stringify(bulkResponse, null, 0),
      "Opensearch Data Synchronization Response",
    );

    return bulkResponse;
  }

  async getCount(index = this.defaultIndex) {
    try {
      return await this.osClient.count({ index });
    } catch (error) {
      throw new HttpException(
        `getCount failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateIndexSettings(updateIndexDto: UpdateIndexDto) {
    const index = updateIndexDto.index.trim();

    try {
      await this.osClient.indices.close({
        index,
      });
      await this.osClient.indices.putSettings({
        index,
        body: { settings: updateIndexDto.settings || this.osConfigs?.settings },
      });

      await this.osClient.indices.open({
        index,
      });

      const { settings } = await this.getIndexConfig(index);

      return settings;
    } catch (error) {
      throw new HttpException(
        `updateIndexSettings failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getIndexConfig(index = this.defaultIndex) {
    try {
      const [settings, mappings] = await Promise.all([
        this.osClient.indices.getSettings({ index }),
        this.osClient.indices.getMapping({ index }),
      ]);

      return {
        settings: settings.body[index].settings,
        mappings: mappings.body[index].mappings,
      };
    } catch (error) {
      throw new HttpException(
        `getIndexConfig failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteIndex(index = this.defaultIndex) {
    try {
      await this.osClient.indices.delete({ index });
      Logger.log(`Opensearch Index Deleted-> Index: ${index} `, "Opensearch");
      return { success: true, message: `Index ${index} deleted` };
    } catch (error) {
      throw new HttpException(
        `deleteIndex failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async search(params: SearchParams): Promise<SearchResult> {
    try {
      const fast = await this.runSearch(params, "fast");
      if (fast.totalCount > 0) return fast;

      return await this.runSearch(params, "wildcard");
    } catch (error) {
      throw new HttpException(
        `search failed -> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  private async runSearch(
    params: SearchParams,
    mode: SearchMode,
  ): Promise<SearchResult> {
    const defaultSort: Sort = [{ _score: "desc" }, { _id: "asc" }];
    const {
      filter,
      index = this.defaultIndex,
      limit = this.maxResultWindow,
      skip = 0,
      sort = defaultSort,
    } = params;

    const { body } = (await this.osClient.search({
      index,
      body: {
        from: skip,
        size: Math.max(0, Math.min(limit, this.maxResultWindow - skip)),
        track_total_hits: this.maxResultWindow,
        _source: false,
        query: this.searchService.buildQuery(filter, mode),
        sort: sort,
      },
    })) as unknown as { body: OsSearchResponseBody };

    const total = body.hits.total;

    return {
      totalCount: typeof total === "number" ? total : (total?.value ?? 0),
      hits: body.hits.hits.map((h) => h._id),
    };
  }

  async updateInsertDocument(data: Partial<DatasetDocument>) {
    try {
      await this.osClient.index({
        index: this.defaultIndex,
        id: data.pid,
        body: data,
        refresh: this.refresh,
      });

      Logger.log(
        `Document Update/inserted-> Document_id: ${data.pid} update/inserted on index: ${this.defaultIndex}`,
        "Opensearch",
      );
    } catch (error) {
      throw new HttpException(
        `updateDocument failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteDocument(id: string, index = this.defaultIndex) {
    try {
      await this.osClient.delete({
        index,
        id,
        refresh: this.refresh,
      });
      Logger.log(
        `Document Deleted-> Document_id: ${id} deleted on index: ${index}`,
        "Opensearch",
      );
    } catch (error) {
      throw new HttpException(
        `deleteDocument failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async checkIndexExists(index: string) {
    const { body: indexExists } = await this.osClient.indices.exists({ index });

    if (!indexExists) {
      throw new Error(`Index ${index} not found`);
    }
  }

  // *** NOTE: below are helper methods ***

  async performBulkOperation<T extends { _id: unknown }>(
    datasource: T[] | Readable | AsyncIterator<T>,
    index: string,
    transform: (doc: Omit<T, "_id">) => Record<string, unknown> = (d) => d,
    onProgress?: (count: number) => void,
  ): Promise<BulkStats> {
    const dropped: string[] = [];
    const reasons = new Map<string, number>();
    let processed = 0;

    const stats = await this.osClient.helpers.bulk({
      datasource,
      flushBytes: 5_000_000,
      concurrency: 5,
      retries: 5,
      wait: 10000,

      onDocument(doc: T) {
        const { _id: mongoId, ...body } = doc;

        processed++;
        if (onProgress && processed % 10_000 === 0) onProgress(processed);
        return [
          { index: { _index: index, _id: String(mongoId) } },
          transform(body as Omit<T, "_id">),
        ];
      },

      onDrop(doc) {
        const id =
          (doc.operation as { index?: { _id?: string } } | undefined)?.index
            ?._id ?? "unknown";

        const reason = (doc.error?.reason ?? doc.error?.type ?? "unknown")
          .replace(/ in document with id '[^']*'/, "")
          .replace(/\. Preview of field's value: '.*'$/, "");

        reasons.set(reason, (reasons.get(reason) ?? 0) + 1);

        dropped.push(id);
      },
    });

    for (const [reason, count] of [...reasons].sort((a, b) => b[1] - a[1])) {
      Logger.error(
        `${count} × ${reason}, failed ids: ${dropped.slice(0, 10)}...`,
        "OpensearchService",
      );
    }

    return stats;
  }
}
