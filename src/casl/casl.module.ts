import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { OrigDatablockAbility } from "./abilities/origdatablocks.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, OrigDatablockAbility],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
