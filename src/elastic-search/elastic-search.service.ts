import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  OnModuleInit,
} from "@nestjs/common";

import { Client } from "@elastic/elasticsearch";
import { SearchQueryService } from "./providers/query-builder.service";
import {
  SearchRequest,
  AggregationsAggregate,
  SortOrder,
} from "@elastic/elasticsearch/lib/api/types";
import { IDatasetFields } from "src/datasets/interfaces/dataset-filters.interface";
import {
  defaultElasticSettings,
  dynamic_template,
} from "./configuration/indexSetting";
import { datasetMappings } from "./configuration/datasetFieldMapping";
import {
  DatasetClass,
  DatasetDocument,
} from "src/datasets/schemas/dataset.schema";
import { ConfigService } from "@nestjs/config";
import { sleep } from "src/common/utils";
import {
  initialSyncTransform,
  transformFacets,
  addValueType,
} from "./helpers/utils";

import { SortFields } from "./providers/fields.enum";

@Injectable()
export class ElasticSearchService implements OnModuleInit {
  private esService: Client;
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
    this.host = this.configService.get<string>("elasticSearch.host") || "";
    this.username =
      this.configService.get<string>("elasticSearch.username") || "";
    this.password =
      this.configService.get<string>("elasticSearch.password") || "";
    this.esEnabled =
      this.configService.get<string>("elasticSearch.enabled") === "yes"
        ? true
        : false;
    this.refresh =
      this.configService.get<"false" | "wait_for">("elasticSearch.refresh") ||
      "false";

    this.defaultIndex =
      this.configService.get<string>("elasticSearch.defaultIndex") || "";

    if (
      this.esEnabled &&
      (!this.host || !this.username || !this.password || !this.defaultIndex)
    ) {
      Logger.error(
        "Missing ENVIRONMENT variables for elastic search connection",
        "ElasticSearch",
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
        Logger.log(
          `New index ${this.defaultIndex}is created `,
          "ElasticSearch",
        );
      }
      this.connected = true;
      Logger.log("Elasticsearch Connected", "ElasticSearch");
    } catch (error) {
      Logger.error(error, "onModuleInit failed-> ElasticSearchService");
    }
  }

  private async connect() {
    const connection = new Client({
      node: this.host,
      auth: {
        username: this.username,
        password: this.password,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });
    await connection.ping();
    this.esService = connection;
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
        "Max retries reached; check Elasticsearch config.",
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async isIndexExists(index = this.defaultIndex) {
    return await this.esService.indices.exists({
      index,
    });
  }

  async createIndex(index = this.defaultIndex) {
    try {
      await this.esService.indices.create({
        index,
        body: {
          settings: defaultElasticSettings,
          mappings: {
            dynamic: true,
            dynamic_templates: dynamic_template,
            numeric_detection: false,
            date_detection: true,
            dynamic_date_formats: [
              "yyyy-MM-dd'T'HH:mm:ss|| yyyy-MM-dd HH:mm:ss||yyyy-MM-dd'T'HH:mm:ss.SSSZ||yyyy-MM-dd'T'HH:mm:ss.SSS'Z'||yyyy-MM-dd'T'HH:mm:ss.SSS",
            ],
            properties: datasetMappings,
          },
        },
      });
      Logger.log(
        `Elasticsearch Index Created-> Index: ${index}`,
        "Elasticsearch",
      );
      return HttpStatus.CREATED;
    } catch (error) {
      throw new HttpException(
        `createIndex failed-> ElasticSearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }
  async syncDatabase(collection: DatasetClass[], index = this.defaultIndex) {
    const indexExists = await this.esService.indices.exists({ index });
    if (!indexExists) {
      throw new Error("Index not found");
    }

    const bulkResponse = await this.performBulkOperation(collection, index);

    Logger.log(
      JSON.stringify(bulkResponse, null, 0),
      "Elasticsearch Data Synchronization Response",
    );

    return bulkResponse;
  }

  async getCount(index = this.defaultIndex) {
    try {
      return await this.esService.count({ index });
    } catch (error) {
      throw new HttpException(
        `getCount failed-> ElasticSearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async updateIndex(index = this.defaultIndex) {
    try {
      await this.esService.indices.close({
        index,
      });
      await this.esService.indices.putSettings({
        index,
        body: { settings: defaultElasticSettings },
      });

      await this.esService.indices.putMapping({
        index,
        dynamic: true,
        body: {
          properties: datasetMappings,
          dynamic_templates: dynamic_template,
        },
      });

      await this.esService.indices.open({
        index,
      });
      Logger.log(
        `Elasticsearch Index Updated-> Index: ${index}`,
        "Elasticsearch",
      );
    } catch (error) {
      throw new HttpException(
        `updateIndex failed-> ElasticSearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async getIndexSettings(index = this.defaultIndex) {
    try {
      return await this.esService.indices.getSettings({ index });
    } catch (error) {
      throw new HttpException(
        `getIndexSettings failed-> ElasticSearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteIndex(index = this.defaultIndex) {
    try {
      await this.esService.indices.delete({ index });
      Logger.log(
        `Elasticsearch Index Deleted-> Index: ${index} `,
        "Elasticsearch",
      );
      return { success: true, message: `Index ${index} deleted` };
    } catch (error) {
      throw new HttpException(
        `deleteIndex failed-> ElasticSearchService ${error}`,
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
      const isSortEmpty = !sort || JSON.stringify(sort) === "{}";
      const searchQuery = this.searchService.buildSearchQuery(searchParam);
      const searchOptions = {
        track_scores: true,
        sort: [{ _score: { order: "desc" } }],
        query: searchQuery.query,
        from: skip,
        size: limit,
        min_score: defaultMinScore,
        track_total_hits: true,
        _source: [""],
      } as SearchRequest;

      if (!isSortEmpty) {
        const sortField = Object.keys(sort)[0];
        const sortDirection = Object.values(sort)[0];

        // NOTE: To sort datasetName field we need to use datasetName.keyword field,
        // as elasticsearch does not have good support for text type field sorting
        const isDatasetName = sortField === SortFields.DatasetName;
        const fieldForSorting = isDatasetName
          ? SortFields.DatasetNameKeyword
          : sortField;

        const isNestedField = fieldForSorting.includes(
          SortFields.ScientificMetadata,
        );

        if (isNestedField) {
          searchOptions.sort = [
            {
              [`${SortFields.ScientificMetadataRunNumberValue}`]: {
                order: sortDirection,
                nested: {
                  path: SortFields.ScientificMetadata,
                },
              },
            },
          ];
        } else {
          searchOptions.sort = [
            { [fieldForSorting]: { order: sortDirection } },
          ];
        }
      }

      const body = await this.esService.search(searchOptions);

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
      } as SearchRequest;

      const body = await this.esService.search(searchOptions);

      const transformedFacets = transformFacets(
        body.aggregations as AggregationsAggregate,
      );

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
    const transformedScientificMetadata = addValueType(
      data.scientificMetadata as Record<string, unknown>,
    );

    const transformedData = {
      ...data,
      scientificMetadata: transformedScientificMetadata,
    };
    try {
      await this.esService.index({
        index: this.defaultIndex,
        id: data.pid,
        document: transformedData,
        refresh: this.refresh,
      });

      Logger.log(
        `Document Update/inserted-> Document_id: ${data.pid} update/inserted on index: ${this.defaultIndex}`,
        "Elasticsearch",
      );
    } catch (error) {
      throw new HttpException(
        `updateDocument failed-> ElasticSearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  async deleteDocument(id: string) {
    try {
      await this.esService.delete({
        index: this.defaultIndex,
        id,
        refresh: this.refresh,
      });
      Logger.log(
        `Document Deleted-> Document_id: ${id} deleted on index: ${this.defaultIndex}`,
        "Elasticsearch",
      );
    } catch (error) {
      throw new HttpException(
        `deleteDocument failed-> ElasticSearchService ${error}`,
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  // *** NOTE: below are helper methods ***

  async performBulkOperation(collection: DatasetClass[], index: string) {
    const result = await this.esService.helpers.bulk({
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
          initialSyncTransform(doc),
        ];
      },
      onDrop(doc) {
        console.debug(`${doc.document.pid}`, doc.error?.reason);
      },
    });
    return result;
  }
}
