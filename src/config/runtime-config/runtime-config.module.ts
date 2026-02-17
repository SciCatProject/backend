import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { RuntimeConfigService } from "./runtime-config.service";
import { RuntimeConfigController } from "./runtime-config.controller";
import {
  RuntimeConfig,
  RuntimeConfigSchema,
} from "./schemas/runtime-config.schema";
import {
  GenericHistory,
  GenericHistorySchema,
} from "src/common/schemas/generic-history.schema";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { CaslModule } from "src/casl/casl.module";
import { applyHistoryPluginOnce } from "src/common/mongoose/plugins/history.plugin.util";

@Module({
  imports: [
    CaslModule,
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: GenericHistory.name,
        schema: GenericHistorySchema,
      },
    ]),
    MongooseModule.forFeatureAsync([
      {
        name: RuntimeConfig.name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const schema = RuntimeConfigSchema;
          applyHistoryPluginOnce(schema, configService);

          return schema;
        },
      },
    ]),
  ],
  controllers: [RuntimeConfigController],
  providers: [RuntimeConfigService],
  exports: [RuntimeConfigService],
})
export class RuntimeConfigModule {}
