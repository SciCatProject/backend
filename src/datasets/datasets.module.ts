import { forwardRef, Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { HttpModule } from "@nestjs/axios";
import { DatasetClass, DatasetSchema } from "./schemas/dataset.schema";
import { DatasetsController } from "./datasets.controller";
import { DatasetsService } from "./datasets.service";
import { AttachmentsModule } from "src/attachments/attachments.module";
import { OrigDatablocksModule } from "src/origdatablocks/origdatablocks.module";
import { DatablocksModule } from "src/datablocks/datablocks.module";
import { InitialDatasetsModule } from "src/initial-datasets/initial-datasets.module";
import { LogbooksModule } from "src/logbooks/logbooks.module";
import { PoliciesService } from "src/policies/policies.service";
import { PoliciesModule } from "src/policies/policies.module";
import { DatasetsV4Controller } from "./datasets.v4.controller";
import { DatasetsPublicV4Controller } from "./datasets-public.v4.controller";
import { DatasetsAccessService } from "./datasets-access.service";
import { CaslModule } from "src/casl/casl.module";
import {
  GenericHistory,
  GenericHistorySchema,
} from "src/common/schemas/generic-history.schema";
import { ConditionalModule, ConfigModule, ConfigService } from "@nestjs/config";
import { applyHistoryPluginOnce } from "src/common/mongoose/plugins/history.plugin.util";
import { applyDatasetPolicyHookOnce } from "./dataset-policy-hook.util";
import { ProposalsModule } from "src/proposals/proposals.module";
import { HistoryModule } from "src/history/history.module";
import { MetadataKeysModule } from "src/metadata-keys/metadatakeys.module";
import { OpensearchModule } from "src/opensearch/opensearch.module";

@Module({
  imports: [
    CaslModule,
    AttachmentsModule,
    DatablocksModule,
    OrigDatablocksModule,
    InitialDatasetsModule,
    HistoryModule,
    MetadataKeysModule,
    ConditionalModule.registerWhen(
      OpensearchModule,
      (env: NodeJS.ProcessEnv) => env.OPENSEARCH_ENABLED === "yes",
    ),
    ProposalsModule,
    forwardRef(() => LogbooksModule),
    MongooseModule.forFeatureAsync([
      {
        name: DatasetClass.name,
        imports: [
          PoliciesModule,
          ConfigModule,
          MongooseModule.forFeature([
            {
              name: GenericHistory.name,
              schema: GenericHistorySchema,
            },
          ]),
        ],
        inject: [PoliciesService, ConfigService],
        useFactory: (
          policyService: PoliciesService,
          configService: ConfigService,
        ) => {
          const schema = DatasetSchema;

          applyDatasetPolicyHookOnce(schema, policyService);

          // Apply history plugin once if schema name matches TRACKABLES config
          applyHistoryPluginOnce(schema, configService);

          return schema;
        },
      },
    ]),
    HttpModule,
  ],
  exports: [DatasetsService, DatasetsAccessService, DatasetsV4Controller],
  controllers: [
    DatasetsPublicV4Controller,
    DatasetsController,
    DatasetsV4Controller,
  ],
  providers: [DatasetsService, DatasetsAccessService, DatasetsV4Controller],
})
export class DatasetsModule {}
