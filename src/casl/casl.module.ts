import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { AttachmentAbility } from "./abilities/attachments.ability";
import { DatasetAbility } from "./abilities/datasets.ability";
import { OrigDatablockAbility } from "./abilities/origdatablocks.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [CaslAbilityFactory, AttachmentAbility, DatasetAbility, OrigDatablockAbility],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
