import { HttpModule } from "@nestjs/axios";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { AttachmentsModule } from "src/attachments/attachments.module";
import { CaslModule } from "src/casl/casl.module";
import { DatasetsModule } from "src/datasets/datasets.module";
import { ProposalsModule } from "src/proposals/proposals.module";
import {
  GenericHistory,
  GenericHistorySchema,
} from "../common/schemas/generic-history.schema";
import { PublishedDataController } from "./published-data.controller";
import { PublishedDataService } from "./published-data.service";
import {
  PublishedData,
  PublishedDataSchema,
} from "./schemas/published-data.schema";
import { applyHistoryPluginOnce } from "src/common/mongoose/plugins/history.plugin.util";
import { PublishedDataV4Controller } from "./published-data.v4.controller";

@Module({
  imports: [
    CaslModule,
    AttachmentsModule,
    DatasetsModule,
    ConfigModule,
    MongooseModule.forFeature([
      {
        name: GenericHistory.name,
        schema: GenericHistorySchema,
      },
    ]),
    HttpModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        timeout: configService.get("httpTimeOut"),
        maxRedirects: configService.get("httpMaxRedirects"),
      }),
      inject: [ConfigService],
    }),
    MongooseModule.forFeatureAsync([
      {
        name: PublishedData.name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const schema = PublishedDataSchema;

          schema.pre<PublishedData>("save", function (next) {
            // if _id is empty or different than doi,
            // set _id to doi
            if (!this._id) {
              this._id = this.doi;
            }
            next();
          });

          // Apply history plugin once if schema name matches TRACKABLES config
          applyHistoryPluginOnce(schema, configService);

          return schema;
        },
      },
    ]),
    ProposalsModule,
  ],
  controllers: [PublishedDataController, PublishedDataV4Controller],
  providers: [PublishedDataService],
})
export class PublishedDataModule {}
