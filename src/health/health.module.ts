import { Module } from "@nestjs/common";
import { TerminusModule } from "@nestjs/terminus";
import { HealthController } from "./health.controller";
import { MongooseModule } from "@nestjs/mongoose";
import { ConfigService } from "@nestjs/config";
import { createMongooseOptions } from "src/common/utils/mongo-connection.util";

@Module({
  imports: [
    TerminusModule,
    MongooseModule.forRootAsync({
      useFactory: createMongooseOptions,
      inject: [ConfigService],
    }),
  ],

  controllers: [HealthController],
})
export class HealthModule {}
