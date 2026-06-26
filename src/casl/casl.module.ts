import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { JobAbility } from "./abilities/jobs.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, JobAbility],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
