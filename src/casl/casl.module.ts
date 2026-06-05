import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { HistoryAbility } from "./abilities/history.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, HistoryAbility],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
