import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { MongooseModule } from "@nestjs/mongoose";
import { CaslModule } from "src/casl/casl.module";
import {
  GenericHistory,
  GenericHistorySchema,
} from "../common/schemas/generic-history.schema";
import { InstrumentsController } from "./instruments.controller";
import { InstrumentsService } from "./instruments.service";
import { Instrument, InstrumentSchema } from "./schemas/instrument.schema";
import { applyHistoryPluginOnce } from "src/common/mongoose/plugins/history.plugin.util";

@Module({
  controllers: [InstrumentsController],
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
        name: Instrument.name,
        imports: [ConfigModule],
        inject: [ConfigService],
        useFactory: (configService: ConfigService) => {
          const schema = InstrumentSchema;

          schema.pre<Instrument>("save", function (next) {
            // if _id is empty or different than pid,
            // set _id to pid
            if (!this._id) {
              this._id = this.pid;
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
  providers: [InstrumentsService],
})
export class InstrumentsModule {}
