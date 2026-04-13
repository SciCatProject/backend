import { Module, forwardRef } from "@nestjs/common";
import { CaslModule } from "src/casl/casl.module";
import { ConfigModule } from "@nestjs/config";
import { DatasetsModule } from "src/datasets/datasets.module";

import { SearchQueryService } from "./providers/query-builder.service";
import { OpensearchService } from "./opensearch.service";
import { OpensearchController } from "./opensearch.controller";

@Module({
  imports: [forwardRef(() => DatasetsModule), ConfigModule, CaslModule],
  controllers: [OpensearchController],
  providers: [OpensearchService, SearchQueryService],
  exports: [OpensearchService, SearchQueryService],
})
export class OpensearchModule {}
