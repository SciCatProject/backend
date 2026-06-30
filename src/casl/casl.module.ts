import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { RuntimeConfigAbility } from "./abilities/runtime-config.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, RuntimeConfigAbility],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
