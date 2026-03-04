import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";
import { Client } from "@opensearch-project/opensearch";

import { SearchQueryService } from "./providers/query-builder.service";

import { IDatasetFields } from "src/datasets/interfaces/dataset-filters.interface";
import { defaultOpensearchSettings } from "./configuration/indexSetting";
import { datasetMappings } from "./configuration/datasetFieldMapping";
import {
  DatasetClass,
  DatasetDocument,
} from "src/datasets/schemas/dataset.schema";
import { ConfigService } from "@nestjs/config";
import { sleep } from "src/common/utils";
import { transformFacets } from "./helpers/utils";

import { SortFields } from "./providers/fields.enum";
import { SortOrder } from "@opensearch-project/opensearch/api/_types/ml._common";
import { IndexSettings } from "@opensearch-project/opensearch/api/_types/indices._common";

@Injectable()
export class OpensearchService implements OnModuleInit {
  private osClient: Client;
  private host: string;
  private username: string;
  private password: string;
  private refresh: "false" | "wait_for";
  public defaultIndex: string;
  public esEnabled: boolean;
  public connected = false;

  constructor(
    private readonly searchService: SearchQueryService,
    private readonly configService: ConfigService,
  ) {
    this.host = this.configService.get<string>("opensearch.host") || "";
    this.username = this.configService.get<string>("opensearch.username") || "";
    this.password = this.configService.get<string>("opensearch.password") || "";
    this.esEnabled =
      this.configService.get<string>("opensearch.enabled") === "yes"
        ? true
        : false;
    this.refresh =
      this.configService.get<"false" | "wait_for">("opensearch.refresh") ||
      "false";

    this.defaultIndex =
      this.configService.get<string>("opensearch.defaultIndex") || "";

    if (
      this.esEnabled &&
      (!this.host || !this.username || !this.password || !this.defaultIndex)
    ) {
      Logger.error(
        "Missing ENVIRONMENT variables for opensearch connection",
        "Opensearch",
      );
    }
  }

  async onModuleInit() {
    if (!this.esEnabled) {
      this.connected = false;
      return;
    }

    try {
      await this.retryConnection(3, 3000);
      const isIndexExists = await this.isIndexExists(this.defaultIndex);

      if (!isIndexExists) {
        await this.createIndex(this.defaultIndex);
        Logger.log(`New index ${this.defaultIndex}is created `, "Opensearch");
      }
      this.connected = true;
      Logger.log("Opensearch Connected", "Opensearch");
    } catch (error) {
      Logger.error(error, "onModuleInit failed-> OpensearchService");
    }
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
  private async retryConnection(maxRetries: number, interval: number) {
    let retryCount = 0;
    while (maxRetries > retryCount) {
      await sleep(interval);
      try {
        await this.connect();
        break;
      } catch (error) {
        Logger.error(`Retry attempt ${retryCount + 1} failed:`, error);
        retryCount++;
      }
    }

    if (retryCount === maxRetries) {
      throw new HttpException(
        "Max retries reached; check Opensearch config.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async isIndexExists(index = this.defaultIndex) {
    return await this.osClient.indices.exists({
      index,
    });
  }

  async createIndex(index = this.defaultIndex) {
    try {
      await this.osClient.indices.create({
        index,
        body: {
          settings: defaultOpensearchSettings as IndexSettings,
          mappings: {
            dynamic: "false",
            properties: datasetMappings,
          },
        },
      });
      Logger.log(`Opensearch Index Created-> Index: ${index}`, "Opensearch");
      return HttpStatus.CREATED;
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

  async updateIndex(index = this.defaultIndex) {
    try {
      await this.osClient.indices.close({
        index,
      });
      await this.osClient.indices.putSettings({
        index,
        body: { settings: defaultOpensearchSettings as IndexSettings },
      });

      await this.osClient.indices.putMapping({
        index,
        body: {
          properties: datasetMappings,
        },
      });

      await this.osClient.indices.open({
        index,
      });
      Logger.log(`Opensearch Index Updated-> Index: ${index}`, "Opensearch");
    } catch (error) {
      throw new HttpException(
        `updateIndex failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getIndexSettings(index = this.defaultIndex) {
    try {
      return await this.osClient.indices.getSettings({ index });
    } catch (error) {
      throw new HttpException(
        `getIndexSettings failed-> OpensearchService ${error}`,
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
    searchParam: IDatasetFields,
    limit = 20,
    skip = 0,
    sort?: Record<string, SortOrder>,
  ): Promise<{ totalCount: number; data: (string | undefined)[] }> {
    const defaultMinScore = searchParam.text ? 1 : 0;

    try {
      // const isSortEmpty = !sort || JSON.stringify(sort) === "{}";
      const searchQuery = this.searchService.buildSearchQuery(searchParam);
      const searchOptions = {
        track_scores: true,
        sort: [{ _score: { order: "desc" } }] as unknown as Record<
          string,
          unknown
        >[],
        query: searchQuery.query,
        from: skip,
        size: limit,
        min_score: defaultMinScore,
        track_total_hits: true,
        _source: [""],
      };

      // if (!isSortEmpty) {
      //   const sortField = Object.keys(sort)[0];
      //   const sortDirection = Object.values(sort)[0];

      //   // NOTE: To sort datasetName field we need to use datasetName.keyword field,
      //   // as Opensearch does not have good support for text type field sorting
      //   const isDatasetName = sortField === SortFields.DatasetName;
      //   const fieldForSorting = isDatasetName
      //     ? SortFields.DatasetNameKeyword
      //     : sortField;

      //   searchOptions.sort = [{ [fieldForSorting]: { order: sortDirection } }];
      // }

      const { body } = await this.osClient.search({
        index: this.defaultIndex,
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

  async aggregate(searchParam: IDatasetFields) {
    try {
      const searchQuery = this.searchService.buildSearchQuery(searchParam);
      const facetPipeline = this.searchService.buildFullFacetPipeline();

      const searchOptions = {
        query: searchQuery.query,
        size: 0,
        aggs: facetPipeline,
        _source: [""],
      };

      const { body } = await this.osClient.search({
        index: this.defaultIndex,
        body: searchOptions,
      });

      const transformedFacets = transformFacets(body.aggregations || {});

      return transformedFacets;
    } catch (error) {
      throw new HttpException(
        `SearchService || aggregate query issue || -> aggregate ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  async updateInsertDocument(data: Partial<DatasetDocument>) {
    //NOTE: Replace all keys with lower case, also replace spaces and dot with underscore
    delete data._id;

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

  async deleteDocument(id: string) {
    try {
      await this.osClient.delete({
        index: this.defaultIndex,
        id,
        refresh: this.refresh,
      });
      Logger.log(
        `Document Deleted-> Document_id: ${id} deleted on index: ${this.defaultIndex}`,
        "Opensearch",
      );
    } catch (error) {
      throw new HttpException(
        `deleteDocument failed-> OpensearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // *** NOTE: below are helper methods ***

  async performBulkOperation(collection: DatasetClass[], index: string) {
    const result = await this.osClient.helpers.bulk({
      retries: 5,
      wait: 10000,
      datasource: collection,
      onDocument(doc: DatasetClass) {
        return [
          {
            index: {
              _index: index,
              _id: doc.pid,
            },
          },
          doc,
        ];
      },
      onDrop(doc) {
        console.debug(`${doc.document.pid}`, doc.error?.reason);
      },
    });
    return result;
  }
}
