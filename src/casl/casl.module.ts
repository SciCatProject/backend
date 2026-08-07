import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { DatasetAbility } from "./abilities/datasets.ability";
import { OpensearchAbility } from "./abilities/opensearch.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, DatasetAbility, OpensearchAbility],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
