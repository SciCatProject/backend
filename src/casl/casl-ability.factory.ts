import {
  AbilityBuilder,
  ExtractSubjectType,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { AccessGroupsType } from "src/config/configuration";
import { SampleClass } from "src/samples/schemas/sample.schema";
import { Action } from "./action.enum";
import { Subjects, PossibleAbilities, Conditions } from "./types/casl-subjects";
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
import { SseAbility } from "./abilities/sse.ability";
import { UserAbility } from "./abilities/users.ability";

export type AppAbility = MongoAbility<PossibleAbilities, Conditions>;

@Injectable()
export class CaslAbilityFactory {
  constructor(
    private configService: ConfigService,
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
    private sseAbility: SseAbility,
    private userAbility: UserAbility,
  ) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
  }
  private accessGroups;

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
    samples: this.samplesEndpointAccess,
    users: this.userAccess,
    sse: this.sseAccess,
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

  sseAccess(user: JWTUser | null) {
    return this.sseAbility.buildAbility(user);
  }

  userAccess(user: JWTUser | null) {
    return this.userAbility.buildAbility(user);
  }

  samplesEndpointAccess(user: JWTUser) {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      // -------------------------------------
      // unauthenticated users
      // -------------------------------------

      can(Action.SampleRead, SampleClass);
      cannot(Action.SampleCreate, SampleClass);
      cannot(Action.SampleUpdate, SampleClass);
      cannot(Action.SampleDelete, SampleClass);
      can(Action.SampleAttachmentRead, SampleClass);
      cannot(Action.SampleAttachmentCreate, SampleClass);
      cannot(Action.SampleAttachmentUpdate, SampleClass);
      cannot(Action.SampleAttachmentDelete, SampleClass);
      cannot(Action.SampleDatasetRead, SampleClass);
    } else {
      // -------------------------------------
      // authenticated users
      // -------------------------------------

      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        // -------------------------------------
        // users that belong to any of the group listed in DELETE_GROUPS
        // -------------------------------------

        can(Action.SampleDelete, SampleClass);
        can(Action.SampleAttachmentDelete, SampleClass);
      } else {
        // -------------------------------------
        // users that do not belong to any of the group listed in DELETE_GROUPS
        // -------------------------------------

        cannot(Action.SampleDelete, SampleClass);
      }

      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        // -------------------------------------
        // users belonging to any of the group listed in ADMIN_GROUPS
        // -------------------------------------

        can(Action.SampleRead, SampleClass);
        can(Action.SampleCreate, SampleClass);
        can(Action.SampleUpdate, SampleClass);
        can(Action.SampleAttachmentRead, SampleClass);
        can(Action.SampleAttachmentCreate, SampleClass);
        can(Action.SampleAttachmentUpdate, SampleClass);
        can(Action.SampleAttachmentDelete, SampleClass);
        can(Action.SampleDatasetRead, SampleClass);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.samplePrivileged.includes(g),
        )
      ) {
        // -------------------------------------
        // users belonging to any of the group listed in SAMPLE_GROUPS
        //

        can(Action.SampleRead, SampleClass);
        can(Action.SampleCreate, SampleClass);
        can(Action.SampleUpdate, SampleClass);
        can(Action.SampleAttachmentRead, SampleClass);
        can(Action.SampleAttachmentCreate, SampleClass);
        can(Action.SampleAttachmentUpdate, SampleClass);
        can(Action.SampleAttachmentDelete, SampleClass);
        can(Action.SampleDatasetRead, SampleClass);
      } else if (
        user.currentGroups.some((g) => this.accessGroups?.sample.includes(g)) ||
        this.accessGroups?.sample.includes("#all")
      ) {
        // -------------------------------------
        // users belonging to any of the group listed in SAMPLE_GROUPS
        //

        can(Action.SampleRead, SampleClass);
        can(Action.SampleCreate, SampleClass);
        can(Action.SampleUpdate, SampleClass);
        can(Action.SampleAttachmentRead, SampleClass);
        can(Action.SampleAttachmentCreate, SampleClass);
        can(Action.SampleAttachmentUpdate, SampleClass);
        can(Action.SampleAttachmentDelete, SampleClass);
        can(Action.SampleDatasetRead, SampleClass);
      } else {
        // -------------------------------------
        // users with no elevated permissions
        // -------------------------------------

        can(Action.SampleRead, SampleClass);
        cannot(Action.SampleCreate, SampleClass);
        cannot(Action.SampleUpdate, SampleClass);
        can(Action.SampleAttachmentRead, SampleClass);
        cannot(Action.SampleAttachmentCreate, SampleClass);
        cannot(Action.SampleAttachmentUpdate, SampleClass);
        if (
          !user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
        ) {
          cannot(Action.SampleAttachmentDelete, SampleClass);
        }
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  samplesInstanceAccess(user: JWTUser) {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      // -------------------------------------
      // unauthenticated users
      // -------------------------------------

      can(Action.SampleReadManyPublic, SampleClass);
      can(Action.SampleReadOnePublic, SampleClass, {
        isPublished: true,
      });
      can(Action.SampleAttachmentReadPublic, SampleClass, {
        isPublished: true,
      });
    } else {
      // -------------------------------------
      // authenticated users
      // -------------------------------------

      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        // -------------------------------------
        // users that belong to any of the group listed in DELETE_GROUPS
        // -------------------------------------

        can(Action.SampleDeleteAny, SampleClass);
        can(Action.SampleAttachmentDeleteAny, SampleClass);
      } else {
        // -------------------------------------
        // users that do not belong to any of the group listed in DELETE_GROUPS
        // -------------------------------------

        cannot(Action.SampleDeleteAny, SampleClass);
        cannot(Action.SampleDeleteOwner, SampleClass);
      }

      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        // -------------------------------------
        // users belonging to any of the group listed in ADMIN_GROUPS
        // -------------------------------------

        can(Action.SampleReadAny, SampleClass);
        can(Action.SampleCreateAny, SampleClass);
        can(Action.SampleUpdateAny, SampleClass);
        can(Action.SampleAttachmentReadAny, SampleClass);
        can(Action.SampleAttachmentCreateAny, SampleClass);
        can(Action.SampleAttachmentUpdateAny, SampleClass);
        can(Action.SampleAttachmentDeleteAny, SampleClass);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.samplePrivileged.includes(g),
        )
      ) {
        // -------------------------------------
        // users belonging to any of the group listed in SAMPLE_GROUPS
        //

        can(Action.SampleCreateAny, SampleClass);
        can(Action.SampleUpdateOwner, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleReadManyAccess, SampleClass);
        can(Action.SampleReadOneAccess, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleReadOneAccess, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleReadOneAccess, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleAttachmentCreateAny, SampleClass);
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleAttachmentUpdateOwner, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentDeleteOwner, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (
        user.currentGroups.some((g) => this.accessGroups?.sample.includes(g)) ||
        this.accessGroups?.sample.includes("#all")
      ) {
        // -------------------------------------
        // users belonging to any of the group listed in SAMPLE_GROUPS
        //

        can(Action.SampleCreateOwner, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleUpdateOwner, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleReadManyAccess, SampleClass);
        can(Action.SampleReadOneAccess, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleReadOneAccess, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleReadOneAccess, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleAttachmentCreateOwner, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleAttachmentUpdateOwner, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentDeleteOwner, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else {
        // -------------------------------------
        // users with no elevated permissions
        // -------------------------------------

        can(Action.SampleReadManyAccess, SampleClass);
        can(Action.SampleReadOneAccess, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleReadOneAccess, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleReadOneAccess, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentReadAccess, SampleClass, {
          isPublished: true,
        });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
