import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Get,
  Query,
  UseInterceptors,
  UseGuards,
  Body,
} from "@nestjs/common";
import {
  ApiTags,
  ApiBearerAuth,
  ApiResponse,
  ApiQuery,
  ApiBody,
  ApiOperation,
} from "@nestjs/swagger";
import { Action } from "src/casl/action.enum";
import { AppAbility } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { DatasetsService } from "src/datasets/datasets.service";
import { SubDatasetsPublicInterceptor } from "src/datasets/interceptors/datasets-public.interceptor";
import { CreateIndexDto } from "./dto/create-index.dto";

import { UpdateIndexDto } from "./dto/update-index.dto";
import { OpensearchService } from "./opensearch.service";
import { Opensearch } from "./opensearch.subject";

@ApiBearerAuth()
@ApiTags("opensearch")
@Controller("opensearch")
export class OpensearchController {
  constructor(
    private readonly opensearchService: OpensearchService,
    private readonly datasetService: DatasetsService,
  ) {}

  @UseGuards(PoliciesGuard)
  @CheckPolicies("opensearch", (ability: AppAbility) =>
    ability.can(Action.Manage, Opensearch),
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiBody({
    description: `If settings and mappings are not provided,
    they will be loaded from the opensearchConfig.json file. 
    To use the default config, simply omit settings and mappings from the request body.`,
    type: CreateIndexDto,
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Create index",
  })
  @Post("/create-index")
  async createIndex(@Body() createIndexDto: CreateIndexDto) {
    return this.opensearchService.createIndex(createIndexDto);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("opensearch", (ability: AppAbility) =>
    ability.can(Action.Manage, Opensearch),
  )
  @ApiOperation({
    summary: "Sync data from MongoDB to OpenSearch",
    description: `Syncs the dataset collection to the specified OpenSearch index. 
      Defaults to the index configured in OPENSEARCH_DEFAULT_INDEX. 
      Currently only supports the dataset collection.`,
  })
  @ApiQuery({
    name: "index",
    description: "The OpenSearch index name to sync the data into",
    default: "dataset",
    type: String,
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: "Successfully synced data from MongoDB to OpenSearch",
  })
  @Post("/sync-database")
  async syncDatabase(@Query("index") index: string) {
    const esIndex = index.trim();
    // NOTE: for now, we will only sync datasets to opensearch,
    // but this can be easily extended to other data in the future if needed
    return await this.datasetService.syncDatasetsToOpensearch(esIndex);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("opensearch", (ability: AppAbility) =>
    ability.can(Action.Manage, Opensearch),
  )
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(SubDatasetsPublicInterceptor)
  @ApiQuery({
    name: "textQuery",
    description: "Partial search text for datasetName and description fields",
    type: String,
  })
  @ApiQuery({
    name: "index",
    description: "The index name to search",
    default: "dataset",
    required: false,
    type: String,
  })
  @ApiQuery({
    name: "limit",
    description: "The maximum number of results to return",
    required: false,
    type: Number,
  })
  @ApiQuery({
    name: "skip",
    description: "The number of results to skip",
    required: false,
    type: Number,
  })
  @ApiResponse({
    status: 200,
    description:
      "Successfully retrieved search results in _ids from Opensearch.",
  })
  @Post("/search")
  async fetchOSResults(
    @Query("index") index: string,
    @Query("limit") limit: number,
    @Query("skip") skip: number,
    @Query("textQuery") text: string,
  ) {
    return this.opensearchService.search({ text }, index, limit, skip);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("opensearch", (ability: AppAbility) =>
    ability.can(Action.Manage, Opensearch),
  )
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: "index",
    description: "The index name to delete",
    default: "dataset",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Delete index",
  })
  @Post("/delete-index")
  async deleteIndex(@Query("index") index: string) {
    return this.opensearchService.deleteIndex(index.trim());
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("opensearch", (ability: AppAbility) =>
    ability.can(Action.Manage, Opensearch),
  )
  @HttpCode(HttpStatus.OK)
  @ApiQuery({
    name: "index",
    description: "The index name to get the config for",
    default: "dataset",
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: "Get index config including settings and mappings",
  })
  @Get("/get-index")
  async getIndex(@Query("index") index: string) {
    return this.opensearchService.getIndexConfig(index.trim());
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("opensearch", (ability: AppAbility) =>
    ability.can(Action.Manage, Opensearch),
  )
  @HttpCode(HttpStatus.OK)
  @ApiBody({
    description: `
    If settings are not provided,
    they will be loaded from the opensearchConfig.json file. 
    To use the default config, simply omit settings from the request body.
    for more details: https://docs.opensearch.org/latest/install-and-configure/configuring-opensearch/index-settings/`,
    type: UpdateIndexDto,
  })
  @ApiResponse({
    status: 200,
    description: "Successfully updated index settings",
  })
  @Post("/update-index")
  async updateIndex(@Body() updateIndexDto: UpdateIndexDto) {
    return this.opensearchService.updateIndexSettings(updateIndexDto);
  }
}
