import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { AttachmentAbility } from "./abilities/attachments.ability";
import { DatablockAbility } from "./abilities/datablocks.ability";
import { DatasetAbility } from "./abilities/datasets.ability";
import { InstrumentAbility } from "./abilities/instruments.ability";
import { LogbookAbility } from "./abilities/logbooks.ability";
import { MetadataKeyAbility } from "./abilities/metadata-keys.ability";
import { OpensearchAbility } from "./abilities/opensearch.ability";
import { OrigDatablockAbility } from "./abilities/origdatablocks.ability";
import { PolicyAbility } from "./abilities/policies.ability";
import { ProposalAbility } from "./abilities/proposals.ability";
import { RuntimeConfigAbility } from "./abilities/runtime-config.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [
    CaslAbilityFactory,
    AttachmentAbility,
    DatablockAbility,
    DatasetAbility,
    InstrumentAbility,
    LogbookAbility,
    MetadataKeyAbility,
    OpensearchAbility,
    OrigDatablockAbility,
    PolicyAbility,
    ProposalAbility,
    RuntimeConfigAbility,
  ],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
