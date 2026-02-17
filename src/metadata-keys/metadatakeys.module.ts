import { Module } from "@nestjs/common";
import {
  MetadataKeyClass,
  MetadataKeySchema,
} from "./schemas/metadatakey.schema";
import { MetadataKeysV4Controller } from "./metadatakeys.v4.controller";
import { MetadataKeysService } from "./metadatakeys.service";
import { HistoryModule } from "src/history/history.module";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigModule, ConfigService } from "@nestjs/config";
import {
  GenericHistory,
  GenericHistorySchema,
} from "src/common/schemas/generic-history.schema";
import { applyHistoryPluginOnce } from "src/common/mongoose/plugins/history.plugin.util";
import { CaslModule } from "src/casl/casl.module";

@Module({
  imports: [
    CaslModule,
    HistoryModule,
    MongooseModule.forFeatureAsync([
      {
        name: MetadataKeyClass.name,
        imports: [
          ConfigModule,
          MongooseModule.forFeature([
            {
              name: GenericHistory.name,
              schema: GenericHistorySchema,
            },
          ]),
        ],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const schema = MetadataKeySchema;

          schema.pre<MetadataKeyClass>("save", async function (next) {
            if (!this._id) {
              this._id = this.id;
            }

            next();
          });

          // Apply history plugin once if schema name matches TRACKABLES config
          applyHistoryPluginOnce(schema, configService);

          return schema;
        },
      },
    ]),
  ],
  exports: [MetadataKeysService],
  controllers: [MetadataKeysV4Controller],
  providers: [MetadataKeysService],
})
export class MetadataKeysModule {}
