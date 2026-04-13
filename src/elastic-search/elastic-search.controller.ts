import {
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Body,
  Get,
  Query,
  UseInterceptors,
  UseGuards,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiBody, ApiResponse } from "@nestjs/swagger";
import { Action } from "src/casl/action.enum";
import { AppAbility } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { DatasetsService } from "src/datasets/datasets.service";
import { SubDatasetsPublicInterceptor } from "src/datasets/interceptors/datasets-public.interceptor";
import { IDatasetFields } from "src/datasets/interfaces/dataset-filters.interface";
import { ElasticSearchActions } from "./dto";
import { CreateIndexDto } from "./dto/create-index.dto";
import { DeleteIndexDto } from "./dto/delete-index.dto";
import { GetIndexDto } from "./dto/get-index.dto";

import { SearchDto } from "./dto/search.dto";
import { SyncDatabaseDto } from "./dto/sync-data.dto";
import { UpdateIndexDto } from "./dto/update-index.dto";
import { ElasticSearchService } from "./elastic-search.service";

@ApiBearerAuth()
@ApiTags("elastic-search")
@Controller("elastic-search")
export class ElasticSearchServiceController {
  constructor(
    private readonly elasticSearchService: ElasticSearchService,
    private readonly datasetService: DatasetsService,
  ) {}

  @UseGuards(PoliciesGuard)
  @CheckPolicies("elastic-search", (ability: AppAbility) =>
    ability.can(Action.Manage, ElasticSearchActions),
  )
  @HttpCode(HttpStatus.CREATED)
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: "Create index",
  })
  @Post("/create-index")
  async createIndex(@Query() { index }: CreateIndexDto) {
    const esIndex = index.trim();

    return this.elasticSearchService.createIndex(esIndex);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("elastic-search", (ability: AppAbility) =>
    ability.can(Action.Manage, ElasticSearchActions),
  )
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: "Sync data to the index",
  })
  @Post("/sync-database")
  async syncDatabase(@Query() { index }: SyncDatabaseDto) {
    const esIndex = index.trim();
    const collectionData = await this.datasetService.getDatasetsWithoutId();

    return this.elasticSearchService.syncDatabase(collectionData, esIndex);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("elastic-search", (ability: AppAbility) =>
    ability.can(Action.Manage, ElasticSearchActions),
  )
  @HttpCode(HttpStatus.OK)
  @UseInterceptors(SubDatasetsPublicInterceptor)
  @ApiBody({
    type: SearchDto,
  })
  @ApiResponse({
    status: 200,
    description: "Search with elasticsearch to get restuls in PIDs",
  })
  @Post("/search")
  async fetchESResults(@Body() searchDto: IDatasetFields) {
    return this.elasticSearchService.search(searchDto);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("elastic-search", (ability: AppAbility) =>
    ability.can(Action.Manage, ElasticSearchActions),
  )
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: "Delete index",
  })
  @Post("/delete-index")
  async deleteIndex(@Query() { index }: DeleteIndexDto) {
    const esIndex = index.trim();

    return this.elasticSearchService.deleteIndex(esIndex);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("elastic-search", (ability: AppAbility) =>
    ability.can(Action.Manage, ElasticSearchActions),
  )
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: "Get current index setting",
  })
  @Get("/get-index")
  async getIndex(@Query() { index }: GetIndexDto) {
    const esIndex = index.trim();

    return this.elasticSearchService.getIndexSettings(esIndex);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("elastic-search", (ability: AppAbility) =>
    ability.can(Action.Manage, ElasticSearchActions),
  )
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    description: "Update index to the latest settings",
  })
  @Post("/update-index")
  async updateIndex(@Query() { index }: UpdateIndexDto) {
    const esIndex = index.trim();

    return this.elasticSearchService.updateIndex(esIndex);
  }
}
