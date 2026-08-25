import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { CaslAbilityFactory } from "./casl-ability.factory";
import { JobConfigModule } from "src/config/job-config/jobconfig.module";
import { AttachmentAbility } from "./abilities/attachments.ability";
import { DatablockAbility } from "./abilities/datablocks.ability";
import { DatasetAbility } from "./abilities/datasets.ability";
import { HistoryAbility } from "./abilities/history.ability";
import { InstrumentAbility } from "./abilities/instruments.ability";
import { JobAbility } from "./abilities/jobs.ability";
import { LogbookAbility } from "./abilities/logbooks.ability";
import { MetadataKeyAbility } from "./abilities/metadata-keys.ability";
import { OpensearchAbility } from "./abilities/opensearch.ability";
import { OrigDatablockAbility } from "./abilities/origdatablocks.ability";
import { PolicyAbility } from "./abilities/policies.ability";
import { ProposalAbility } from "./abilities/proposals.ability";
import { PublishedDataAbility } from "./abilities/published-data.ability";
import { RuntimeConfigAbility } from "./abilities/runtime-config.ability";
import { SampleAbility } from "./abilities/samples.ability";
import { UserAbility } from "./abilities/users.ability";

@Module({
  imports: [JobConfigModule, ConfigModule],
  providers: [
    CaslAbilityFactory,
    AttachmentAbility,
    DatablockAbility,
    DatasetAbility,
    HistoryAbility,
    InstrumentAbility,
    JobAbility,
    LogbookAbility,
    MetadataKeyAbility,
    OpensearchAbility,
    OrigDatablockAbility,
    PolicyAbility,
    ProposalAbility,
    PublishedDataAbility,
    RuntimeConfigAbility,
    SampleAbility,
    UserAbility,
  ],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
