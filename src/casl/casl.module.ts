import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { MetadataKeyAbility } from "./abilities/metadata-keys.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, MetadataKeyAbility],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
