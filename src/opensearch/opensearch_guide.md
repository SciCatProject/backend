# Getting started

To be able to start application with Elasticsearch you will need to:

1. Start with `npm prepare:local` to executes docker-compose file which pull and run Elasticsearch cluster as a docker container.
2. Start the application with `npm run start`

# Check the .env file

Following environment variables are required to run Elasticsearch with Scicat Backend:

| `Variables`              | Values                 | Description                                                                                                    |
| ------------------------ | :--------------------- | :------------------------------------------------------------------------------------------------------------- |
| `ELASTICSEARCH_ENABLED`  | `yes` or `no`          | Flag to enable/disable the ElasticSearch service                                                               |
| `ES_HOST `               | https://localhost:9200 | Use `http` if `xpack.security.enabled` set to `false`                                                          |
| `ES_USERNAME` (optional) | elastic                | Elasticsearch cluster username. Can be customized with docker image environment values with `ELASTIC_USERNAME` |
| `ES_PASSWORD`            | password               | Elasticsearch cluster password. Can be customized with docker image environment values `ELASTIC_PASSWORD`      |
| `MONGODB_COLLECTION `    | Dataset                | Collection name to be mapped into specified Elasticsearch index                                                |
| `ES_MAX_RESULT    `      | 210000                 | Maximum records can be indexed into Elasticsearch. If not set, default is `10000`                              |
| `ES_FIELDS_LIMIT `       | 400000                 | The total number of fields in an index. If not set, default is `1000`                                          |
| `ES_INDEX     `          | dataset                | Setting default index for the application                                                                      |
| `ES_REFRESH  `           | wait_for               | Wait for the change to become visible - CRUD actions                                                           |
|                          |                        |

## \*\* NOTE \*\*

`ES_REFRESH="wait_for"` is used for better testing flow. For production it should be set to false. Detailed docs about this setting can be found: [docs-refresh](https://www.elastic.co/guide/en/elasticsearch/reference/current/docs-refresh.html)

# Steps to synchronize data with Elasitcsearch

To enable search queries in Elasticsearch, you should adhere to the following steps:

1. Open Swagger page `http://localhost:3000/explorer`, Authorize with `admin` token
2. Open elastic-search endpoints and execute `create-index`.
   _**NOTE:**_ This step can be skipped if you want to use default index `dataset`
3. execute `sync-database` to sync data into the given index.

If you see the following response, it means Elasticsearch is ready for use.

```
{
  "total": 21670,
  "failed": 0,
  "retry": 0,
  "successful": 21670,
  "noop": 0,
  "time": 4777,
  "bytes": 279159021,
  "aborted": false
}
```

# Index, analysis and mapping settings

Index settings in Elasticsearch are used to define various configurations and behaviors for an index. Index settings are vital for optimizing Elasticsearch's performance, relevance of search results, and resource management, ensuring that the index operates efficiently and effectively according to the specific needs of the application using it.

Pre-defined index settings & dynamic mapping for nested objects can be found `/src/elastic-search/configuration/indexSetting.ts`

Fields to be mapped into Elasticsearch index can be found `/src/elastic-search/configuration/datasetFieldMapping.ts`

**Index settings:**

```
export const defaultElasticSettings = {
  index: {
    max_result_window: process.env.ES_MAX_RESULT || 2000000,
    number_of_replicas: 0,
    mapping: {
      total_fields: {
        limit: process.env.ES_FIELDS_LIMIT || 2000000,
      },
      nested_fields: {
        limit: 1000,
      },
    },
  },
  analysis: {
    analyzer: {
      autocomplete: {
        tokenizer: "autocomplete",
        filter: ["lowercase"],
      },
      autocomplete_search: {
        tokenizer: "lowercase",
      },
    },
    tokenizer: {
      autocomplete: autocomplete_tokenizer,
    },
  },
} as IndicesIndexSettingsAnalysis;
```

| `Object`                            | Description                                                                                                                                                                                                                                                                                                                                                          |
| ----------------------------------- | :------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `index`                             | It contains settings that determine how an Elasticsearch index works, like how many results you can get from a search and how many copies of the data it should store. More details in [index modules](https://www.elastic.co/guide/en/elasticsearch/reference/current/index-modules.html)                                                                           |
| `index.max_result_window`           | Determines the maximum number of documents returned in a query. `Default is 10000`                                                                                                                                                                                                                                                                                   |
| `index.number_of_replicas`          | Sets the number of replica shards. `Default is 1`                                                                                                                                                                                                                                                                                                                    |
| `index.mapping.total_fields.limit`  | Sets the maximum number of fields an index can have. `Default is 1000`                                                                                                                                                                                                                                                                                               |
| `index.mapping.nested_fields.limit` | Sets the maximum number of nested fields. `Default is 50`                                                                                                                                                                                                                                                                                                            |
| `analysis`                          | It defines how text data is processed before it is indexed, including custom analyzers and tokenizers which control the conversion of text into tokens or terms. More details in [analyzer](https://www.elastic.co/guide/en/elasticsearch/reference/current/analyzer.html) and [analysis](https://www.elastic.co/guide/en/elasticsearch/reference/8.8/analysis.html) |

</br>

**Dynamic mapping:**

Dynamic mapping is currently only used for scientific field. More details in [Dynamic template](https://www.elastic.co/guide/en/elasticsearch/reference/8.8/dynamic-templates.html)

```
export const dynamic_template: Record<string, MappingDynamicTemplate>[] = [
  {
    string_as_keyword: {
      path_match: "scientificMetadata.*.*",
      match_mapping_type: "string",
      mapping: {
        type: "keyword",
        ignore_above: 256,
      },
    },
  },
  {
    long_as_double: {
      path_match: "scientificMetadata.*.*",
      match_mapping_type: "long",
      mapping: {
        type: "double",
        coerce: true,
        ignore_malformed: true,
      },
    },
  },
  {
    date_as_keyword: {
      path_match: "scientificMetadata.*.*",
      match_mapping_type: "date",
      mapping: {
        type: "keyword",
        ignore_above: 256,
      },
    },
  },
];
```

# APIs

`NOTE: All requests require admin permissions.`

For search query integration it is suggested to use client search service directly, which can be found `/src/elastic-search/elastic-search.service.ts`

**Following table is existing controller endpoints:**

| endpoint                                    | parameters                                                                                                                                                                     | request       | description                                       |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ------------------------------------------------- |
| /api/v3/elastic-search/create-index?index=  | `string`                                                                                                                                                                       | query         | Create an index with this name                    |
| /api/v3/elastic-search/sync-database?index= | `string`                                                                                                                                                                       | query         | Sync datasets into elastic search with this index |
| /api/v3/elastic-search/search               | `{ "text": "", "ownerGroup": [], "creationLocation": [], "type": [], "keywords": [], "isPublished": false, "scientific": [{"lhs": "", "relation": "", "rhs": 0, "unit": ""}]}` | body          | Search query                                      |
| /api/v3/elastic-search/delete-index         | `string`                                                                                                                                                                       | query         | Delete an index with this name                    |
| /api/v3/elastic-search/get-index            | `string`                                                                                                                                                                       | query         | Get an index settings with this name              |
| /api/v3/elastic-search/update-index         | `to be updated`                                                                                                                                                                | to be updated | to be updated                                     |

# Setting up a local Elasticsearch cluster

## Docker Configuration

For local development, you can spin up an Elasticsearch cluster using Docker with the following configuration:

_Elasticsearch image configuration can be found in `./CI/E2E/docker-compose-local.yaml`_

```
es01:
  image: docker.elastic.co/elasticsearch/elasticsearch:8.8.2
  ports:
    - 9200:9200
  environment:
    - xpack.security.enabled=false
    - node.name=es01
    - ES_JAVA_OPTS=-Xms2g -Xmx2g
    - cluster.name=es-cluster
    - cluster.initial_master_nodes=es01
    - ELASTIC_PASSWORD=password
    - bootstrap.memory_lock=true
  mem_limit: 4g
  ulimits:
    memlock:
      soft: -1
      hard: -1
```

| **`Settings`**               | **`Description`**                                                                      |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| Image Version                | Docker image for Elasticsearch: `docker.elastic.co/elasticsearch/elasticsearch:8.8.2`. |
| Port                         | Container-to-host port mapping: `9200:9200`.                                           |
| mem_limit                    | Maximum container memory, influenced by `ES_JAVA_OPTS`.                                |
| ulimits.memlock (soft, hard) | Memory locking limits: `-1` for unlimited.                                             |
| **`Variables`**              | **`Description`**                                                                      |
| xpack.security.enabled       | Toggle for Elasticsearch security; `false` disables authentication for development.    |
| node.name                    | Unique Elasticsearch node name; essential for cluster node identification.             |
| ES_JAVA_OPTS                 | JVM heap memory settings for Elasticsearch performance (e.g., `-Xms2g -Xmx2g`).        |
| cluster.name                 | Name of the Elasticsearch cluster for node grouping.                                   |
| ELASTIC_PASSWORD             | Password for the 'elastic' user; not needed if security is disabled.                   |
| bootstrap.memory_lock        | Prevents swapping Elasticsearch memory to disk when enabled.                           |

## Using Helm for Kubernetes

For those looking to deploy on Kubernetes, refer to the official [Helm chart documentation](https://github.com/elastic/helm-charts/tree/main/elasticsearch) for Elasticsearch. Helm charts provide a more production-ready setup and can manage complex configurations.

**More configuration information:**

- [More complicated examples with docker-compose configuration](https://www.elastic.co/guide/en/elasticsearch/reference/8.8/docker.html)
- [More service configures for production](https://www.elastic.co/guide/en/elasticsearch/reference/8.8/important-settings.html)
