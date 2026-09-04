import { MongoAbility } from "@casl/ability";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { PossibleAbilities, Conditions } from "./types/casl-subjects";
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
import { SseAbility } from "./abilities/sse.ability";
import { UserAbility } from "./abilities/users.ability";

export type AppAbility = MongoAbility<PossibleAbilities, Conditions>;

@Injectable()
export class CaslAbilityFactory {
  constructor(
    private attachmentAbility: AttachmentAbility,
    private datablockAbility: DatablockAbility,
    private datasetAbility: DatasetAbility,
    private historyAbility: HistoryAbility,
    private instrumentAbility: InstrumentAbility,
    private jobAbility: JobAbility,
    private logbookAbility: LogbookAbility,
    private metadataKeyAbility: MetadataKeyAbility,
    private opensearchAbility: OpensearchAbility,
    private origDatablockAbility: OrigDatablockAbility,
    private policyAbility: PolicyAbility,
    private proposalAbility: ProposalAbility,
    private publishedDataAbility: PublishedDataAbility,
    private runtimeConfigAbility: RuntimeConfigAbility,
    private sampleAbility: SampleAbility,
    private sseAbility: SseAbility,
    private userAbility: UserAbility,
  ) {}

  private endpointAccessors: {
    [endpoint: string]: (user: JWTUser) => AppAbility;
  } = {
    attachments: this.attachmentAccess,
    datablocks: this.datablockAccess,
    datasets: this.datasetAccess,
    history: this.historyAccess,
    instruments: this.instrumentAccess,
    jobs: this.jobAccess,
    logbooks: this.logbookAccess,
    metadataKeys: this.metadataKeyAccess,
    opensearch: this.opensearchAccess,
    origdatablocks: this.origDatablockAccess,
    policies: this.policyAccess,
    proposals: this.proposalAccess,
    publisheddata: this.publishedDataAccess,
    runtimeconfig: this.runtimeConfigAccess,
    samples: this.sampleAccess,
    sse: this.sseAccess,
    users: this.userAccess,
  };

  endpointAccess(endpoint: string, user: JWTUser) {
    const accessFunction = this.endpointAccessors[endpoint];
    if (!accessFunction) {
      throw new InternalServerErrorException(
        `No endpoint access policies defined for subject: ${endpoint}`,
      );
    }
    return accessFunction.call(this, user);
  }

  attachmentAccess(user: JWTUser | null) {
    return this.attachmentAbility.buildAbility(user);
  }

  datablockAccess(user: JWTUser | null) {
    return this.datablockAbility.buildAbility(user);
  }

  datasetAccess(user: JWTUser | null) {
    return this.datasetAbility.buildAbility(user);
  }

  historyAccess(user: JWTUser | null) {
    return this.historyAbility.buildAbility(user);
  }

  instrumentAccess(user: JWTUser | null) {
    return this.instrumentAbility.buildAbility(user);
  }

  jobAccess(user: JWTUser | null) {
    return this.jobAbility.buildAbility(user);
  }

  logbookAccess(user: JWTUser | null) {
    return this.logbookAbility.buildAbility(user);
  }

  metadataKeyAccess(user: JWTUser | null) {
    return this.metadataKeyAbility.buildAbility(user);
  }

  opensearchAccess(user: JWTUser | null) {
    return this.opensearchAbility.buildAbility(user);
  }

  origDatablockAccess(user: JWTUser | null) {
    return this.origDatablockAbility.buildAbility(user);
  }

  policyAccess(user: JWTUser | null) {
    return this.policyAbility.buildAbility(user);
  }

  proposalAccess(user: JWTUser | null) {
    return this.proposalAbility.buildAbility(user);
  }

  publishedDataAccess(user: JWTUser | null) {
    return this.publishedDataAbility.buildAbility(user);
  }

  runtimeConfigAccess(user: JWTUser | null) {
    return this.runtimeConfigAbility.buildAbility(user);
  }

  sampleAccess(user: JWTUser | null) {
    return this.sampleAbility.buildAbility(user);
  }

  sseAccess(user: JWTUser | null) {
    return this.sseAbility.buildAbility(user);
  }

  userAccess(user: JWTUser | null) {
    return this.userAbility.buildAbility(user);
  }
}
