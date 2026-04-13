import { Module, forwardRef } from "@nestjs/common";
import { CaslModule } from "src/casl/casl.module";
import { ConfigModule } from "@nestjs/config";
import { DatasetsModule } from "src/datasets/datasets.module";
import { ElasticSearchServiceController } from "./elastic-search.controller";
import { ElasticSearchService } from "./elastic-search.service";
import { SearchQueryService } from "./providers/query-builder.service";

@Module({
  imports: [forwardRef(() => DatasetsModule), ConfigModule, CaslModule],
  controllers: [ElasticSearchServiceController],
  providers: [ElasticSearchService, SearchQueryService],
  exports: [ElasticSearchService, SearchQueryService],
})
export class ElasticSearchModule {}
