import { forwardRef, Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AuthModule } from "src/auth/auth.module";
import { CaslModule } from "src/casl/casl.module";
import { DatasetsModule } from "src/datasets/datasets.module";
import { UsersModule } from "src/users/users.module";
import {
  GenericHistory,
  GenericHistorySchema,
} from "../common/schemas/generic-history.schema";
import { PoliciesController } from "./policies.controller";
import { PoliciesV4Controller } from "./policies.v4.controller";
import { PoliciesService } from "./policies.service";
import { Policy, PolicySchema } from "./schemas/policy.schema";
import { applyHistoryPluginOnce } from "src/common/mongoose/plugins/history.plugin.util";

@Module({
  controllers: [PoliciesController, PoliciesV4Controller],
  imports: [
    AuthModule,
    CaslModule,
    forwardRef(() => DatasetsModule), //Keep the forward reference to DatasetsModule
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: GenericHistory.name,
        schema: GenericHistorySchema,
      },
    ]),
    MongooseModule.forFeatureAsync([
      //Convert Policy to async factory to add history plugin
      {
        name: Policy.name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const schema = PolicySchema;

          // Apply history plugin once if schema name matches TRACKABLES config
          applyHistoryPluginOnce(schema, configService);

          return schema;
        },
      },
    ]),
    UsersModule,
  ],
  providers: [PoliciesService],
  exports: [PoliciesService],
})
export class PoliciesModule {}
