import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { Client } from "@opensearch-project/opensearch";

import { SearchQueryService } from "./providers/query-builder.service";

import {
  DatasetClass,
  DatasetDocument,
} from "src/datasets/schemas/dataset.schema";
import { ConfigService } from "@nestjs/config";
import { sleep } from "src/common/utils";

import type { IndexSettings } from "@opensearch-project/opensearch/api/_types/indices._common";
import { ISearchFilter } from "./interfaces/os-common.type";
import { CreateIndexDto } from "./dto/create-index.dto";
import { UpdateIndexDto } from "./dto/update-index.dto";
import type { TypeMapping } from "@opensearch-project/opensearch/api/_types/_common.mapping";

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
      `Opensearch is enabled but index ${index} is empty`,
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

  async search(
    filter: ISearchFilter,
    index = this.defaultIndex,
    limit = 1000,
    skip = 0,
  ): Promise<{ totalCount: number; data: (string | undefined)[] }> {
    try {
      const searchQuery = this.searchService.buildSearchQuery(filter);
      const searchOptions = {
        track_scores: true,
        sort: [{ _score: { order: "desc" } }] as unknown as Record<
          string,
          unknown
        >[],
        query: searchQuery.query,
        from: skip,
        size: limit,
        min_score: 0.1,
        track_total_hits: true,
        _source: [""],
      };

      const { body } = await this.osClient.search({
        index,
        body: searchOptions,
      });

      const totalCount = body.hits.hits.length || 0;

      const data = body.hits.hits.map((item) => item._id || "");

      return {
        totalCount,
        data,
      };
    } catch (error) {
      throw new HttpException(
        `SearchService || search query issue || -> search ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
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
    collection: T[],
    index: string,
  ) {
    const result = await this.osClient.helpers.bulk({
      retries: 5,
      wait: 10000,
      datasource: collection,
      onDocument(doc: T) {
        const { _id: mongoId, ...body } = doc;
        return [
          {
            index: {
              _index: index,
              _id: mongoId,
            },
          },
          body,
        ];
      },
      onDrop(doc) {
        console.debug(`${doc.document._id}`, doc.error?.reason);
      },
    });
    return result;
  }
}
