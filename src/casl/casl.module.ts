import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { DatasetAbility } from "./abilities/datasets.ability";
import { UserAbility } from "./abilities/users.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, DatasetAbility, UserAbility],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
