import {
  AbilityBuilder,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  MongoQuery,
  createMongoAbility,
} from "@casl/ability";
import { Injectable, InternalServerErrorException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { AccessGroupsType } from "src/config/configuration";
import { JobConfigService } from "src/config/job-config/jobconfig.service";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { JobClass } from "src/jobs/schemas/job.schema";
import { CreateJobAuth, UpdateJobAuth } from "src/jobs/types/jobs-auth.enum";
import { Logbook } from "src/logbooks/schemas/logbook.schema";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { Policy } from "src/policies/schemas/policy.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";
import { UserIdentity } from "src/users/schemas/user-identity.schema";
import { UserSettings } from "src/users/schemas/user-settings.schema";
import { User } from "src/users/schemas/user.schema";
import { Action } from "./action.enum";
import { RuntimeConfig } from "src/config/runtime-config/schemas/runtime-config.schema";
import { MetadataKeyClass } from "src/metadata-keys/schemas/metadatakey.schema";
import { Opensearch } from "src/opensearch/opensearch.subject";
import { GenericHistory } from "src/common/schemas/generic-history.schema";

type Subjects =
  | string
  | InferSubjects<
      | typeof Attachment
      | typeof Datablock
      | typeof DatasetClass
      | typeof GenericHistory
      | typeof Instrument
      | typeof JobClass
      | typeof Logbook
      | typeof MetadataKeyClass
      | typeof Opensearch
      | typeof OrigDatablock
      | typeof Policy
      | typeof ProposalClass
      | typeof PublishedData
      | typeof RuntimeConfig
      | typeof SampleClass
      | typeof User
      | typeof UserIdentity
      | typeof UserSettings
    >
  | "all";
type PossibleAbilities = [Action, Subjects];
type Conditions = MongoQuery;

export type AppAbility = MongoAbility<PossibleAbilities, Conditions>;

@Injectable()
export class CaslAbilityFactory {
  constructor(
    private configService: ConfigService,
    private jobConfigService: JobConfigService,
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
    samples: this.sampleAccess,
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

  attachmentAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    if (!user) {
      /**
       * Unauthenticated user
       */
      can(Action.AttachmentRead, Attachment, {
        isPublished: true,
      });
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.AttachmentDelete, Attachment);
      }

      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.AccessAny, Attachment);

        can(Action.AttachmentCreate, Attachment);
        can(Action.AttachmentRead, Attachment);
        can(Action.AttachmentUpdate, Attachment);
        can(Action.AttachmentDelete, Attachment);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.attachmentPrivileged.includes(g),
        )
      ) {
        /**
         * User belonging to ATTACHMENT_PRIVILEGED_GROUPS
         */
        can(Action.AttachmentCreate, Attachment);

        can(Action.AttachmentRead, Attachment, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.AttachmentRead, Attachment, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.AttachmentRead, Attachment, {
          isPublished: true,
        });

        can(Action.AttachmentUpdate, Attachment, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.AttachmentDelete, Attachment, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.attachment.includes(g),
        ) ||
        this.accessGroups?.attachment.includes("#all")
      ) {
        /**
         * User belonging to ATTACHMENT_GROUPS
         */
        can(Action.AttachmentCreate, Attachment, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.AttachmentRead, Attachment, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.AttachmentRead, Attachment, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.AttachmentRead, Attachment, {
          isPublished: true,
        });

        can(Action.AttachmentUpdate, Attachment, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.AttachmentDelete, Attachment, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.AttachmentRead, Attachment, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.AttachmentRead, Attachment, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.AttachmentRead, Attachment, {
          isPublished: true,
        });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  // TODO: The access rights granted depending on group are irregular
  //       and dependent on dataset groups
  datablockAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
       * Unauthenticated user
       */
      can(Action.DatablockRead, Datablock, {
        isPublished: true,
      });
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.DatablockRead, Datablock);
        can(Action.DatablockUpdate, Datablock);
        can(Action.DatablockDelete, Datablock);
      }

      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.DatablockCreate, Datablock);
        can(Action.DatablockRead, Datablock);
        can(Action.DatablockUpdate, Datablock);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createDataset.includes(g),
        ) ||
        user.currentGroups.some((g) =>
          this.accessGroups?.createDatasetPrivileged.includes(g),
        ) ||
        user.currentGroups.some((g) =>
          this.accessGroups?.createDatasetWithPid.includes(g),
        )
      ) {
        /**
         * User belonging to CREATE_DATASET_GROUPS,
         * CREATE_DATASET_WITH_PID_GROUPS or CREATE_DATASET_PRIVILEGED_GROUPS
         */
        can(Action.DatablockCreate, Datablock);

        can(Action.DatablockRead, Datablock, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatablockRead, Datablock, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatablockRead, Datablock, {
          isPublished: true,
        });

        can(Action.DatablockUpdate, Datablock);
      } else {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.DatablockRead, Datablock, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatablockRead, Datablock, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatablockRead, Datablock, {
          isPublished: true,
        });

        can(Action.DatablockUpdate, Datablock, {
          ownerGroup: { $in: user.currentGroups },
        });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  datasetAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
       * Unauthenticated user
       */
      can(Action.DatasetRead, DatasetClass, {
        isPublished: true,
      });

      can(Action.DatasetAttachmentRead, DatasetClass, {
        isPublished: true,
      });

      can(Action.DatasetDatablockRead, DatasetClass, {
        isPublished: true,
      });

      can(Action.DatasetOrigdatablockRead, DatasetClass, {
        isPublished: true,
      });
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.DatasetDelete, DatasetClass);
        can(Action.DatasetAttachmentDelete, DatasetClass);
        can(Action.DatasetDatablockDelete, DatasetClass);
        can(Action.DatasetOrigdatablockDelete, DatasetClass);
      }
      if (
        user.currentGroups.some((g) =>
          this.accessGroups?.updateDatasetLifecycle.includes(g),
        )
      ) {
        /**
         * User belonging to UPDATE_DATASET_LIFECYCLE_GROUPS
         */
        can(Action.AccessAny, DatasetClass);

        can(Action.DatasetRead, DatasetClass);
        can(Action.DatasetLifecycleUpdate, DatasetClass);
      }
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.AccessAny, DatasetClass);

        can(Action.DatasetCreate, DatasetClass);
        can(Action.DatasetRead, DatasetClass);
        can(Action.DatasetUpdate, DatasetClass);
        can(Action.DatasetLifecycleUpdate, DatasetClass);

        can(Action.DatasetAttachmentCreate, DatasetClass);
        can(Action.DatasetAttachmentRead, DatasetClass);
        can(Action.DatasetAttachmentUpdate, DatasetClass);
        can(Action.DatasetAttachmentDelete, DatasetClass);

        can(Action.DatasetOrigdatablockCreate, DatasetClass);
        can(Action.DatasetOrigdatablockRead, DatasetClass);
        can(Action.DatasetOrigdatablockUpdate, DatasetClass);

        can(Action.DatasetDatablockCreate, DatasetClass);
        can(Action.DatasetDatablockRead, DatasetClass);
        can(Action.DatasetDatablockUpdate, DatasetClass);

        can(Action.DatasetLogbookRead, DatasetClass);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createDatasetPrivileged.includes(g),
        )
      ) {
        /**
         * User belonging to CREATE_DATASET_PRIVILEGED_GROUPS
         */
        can(Action.DatasetCreate, DatasetClass);
        can(Action.DatasetRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetLifecycleUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetAttachmentCreate, DatasetClass);
        can(Action.DatasetAttachmentRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetAttachmentUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentDelete, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetOrigdatablockCreate, DatasetClass);
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetOrigdatablockUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetDatablockCreate, DatasetClass);
        can(Action.DatasetDatablockRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetDatablockUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetLogbookRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createDatasetWithPid.includes(g),
        ) ||
        this.accessGroups?.createDatasetWithPid.includes("#all")
      ) {
        /**
         * User belonging to CREATE_DATASET_WITH_PID_GROUPS
         */
        can(Action.DatasetCreate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetLifecycleUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetAttachmentCreate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetAttachmentUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentDelete, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetOrigdatablockCreate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetOrigdatablockUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetDatablockCreate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetDatablockUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetLogbookRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createDataset.includes(g),
        ) ||
        this.accessGroups?.createDataset.includes("#all")
      ) {
        /**
         * User belonging to CREATE_DATASET_GROUPS
         */
        can(Action.DatasetCreate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
          pid: { $eq: "" },
        });
        can(Action.DatasetRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetLifecycleUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetAttachmentCreate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetAttachmentUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentDelete, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetDatablockCreate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetDatablockUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetOrigdatablockCreate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          isPublished: true,
        });
        can(Action.DatasetOrigdatablockUpdate, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.DatasetLogbookRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (user) {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.DatasetRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetRead, DatasetClass, {
          isPublished: true,
        });

        can(Action.DatasetAttachmentRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetAttachmentRead, DatasetClass, {
          isPublished: true,
        });

        can(Action.DatasetDatablockRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetDatablockRead, DatasetClass, {
          isPublished: true,
        });

        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.DatasetOrigdatablockRead, DatasetClass, {
          isPublished: true,
        });

        can(Action.DatasetLogbookRead, DatasetClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  historyAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (user) {
      if (
        user.currentGroups.some(
          (g) =>
            this.accessGroups?.admin && this.accessGroups.admin.includes(g),
        )
      ) {
        can(Action.HistoryRead, GenericHistory);

        can(Action.HistoryRead, Attachment);
        can(Action.HistoryRead, Datablock);
        can(Action.HistoryRead, DatasetClass);
        can(Action.HistoryRead, Instrument);
        can(Action.HistoryRead, Policy);
        can(Action.HistoryRead, ProposalClass);
        can(Action.HistoryRead, PublishedData);
        can(Action.HistoryRead, SampleClass);
      } else {
        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historyAttachments.includes(g),
          )
        ) {
          can(Action.HistoryRead, GenericHistory);
          can(Action.HistoryRead, Attachment);
        }

        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historyDatablocks.includes(g),
          )
        ) {
          can(Action.HistoryRead, GenericHistory);
          can(Action.HistoryRead, Datablock);
        }

        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historyDataset.includes(g),
          )
        ) {
          can(Action.HistoryRead, GenericHistory);
          can(Action.HistoryRead, DatasetClass);
        }

        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historyInstrument.includes(g),
          )
        ) {
          can(Action.HistoryRead, GenericHistory);
          can(Action.HistoryRead, Instrument);
        }

        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historyPolicies.includes(g),
          )
        ) {
          can(Action.HistoryRead, GenericHistory);
          can(Action.HistoryRead, Policy);
        }

        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historyProposal.includes(g),
          )
        ) {
          can(Action.HistoryRead, GenericHistory);
          can(Action.HistoryRead, ProposalClass);
        }

        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historyPublishedData.includes(g),
          )
        ) {
          can(Action.HistoryRead, GenericHistory);
          can(Action.HistoryRead, PublishedData);
        }

        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historySample.includes(g),
          )
        ) {
          can(Action.HistoryRead, GenericHistory);
          can(Action.HistoryRead, SampleClass);
        }
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  instrumentAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
       * Unauthenticated user
       */
      can(Action.InstrumentRead, Instrument);
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.InstrumentDelete, Instrument);
      }

      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.InstrumentCreate, Instrument);
        can(Action.InstrumentRead, Instrument);
        can(Action.InstrumentUpdate, Instrument);
      } else {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.InstrumentRead, Instrument);
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  jobAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    Object.entries(this.jobConfigService.allJobConfigs).forEach(
      ([jobType, jobConfig]) => {
        const typeScope = jobType ? { type: jobType } : {};

        if (!user) {
          /**
           * Unauthenticated user
           */
          if (
            jobConfig.create.auth === CreateJobAuth.All ||
            jobConfig.create.auth === CreateJobAuth.DatasetPublic
          ) {
            can(Action.JobCreate, JobClass, typeScope);
          }
          if (jobConfig.update.auth === UpdateJobAuth.All) {
            can(Action.JobUpdate, JobClass, {
              ownerGroup: undefined,
              ...typeScope,
            });
          }
        } else {
          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.deleteJob.includes(g),
            )
          ) {
            /**
             * User belonging to DELETE_JOB_GROUPS
             */
            can(Action.JobDelete, JobClass);
          }

          if (
            user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
          ) {
            /**
             * User belonging to ADMIN_GROUPS
             */
            can(Action.JobCreate, JobClass);
            can(Action.JobRead, JobClass);
            can(Action.JobUpdate, JobClass);
          } else if (
            user.currentGroups.some((g) =>
              this.accessGroups?.createJobPrivileged.includes(g),
            )
          ) {
            /**
             * User belonging to CREATE_JOB_PRIVILEGED_GROUPS
             */
            can(Action.JobCreate, JobClass);
            can(Action.JobRead, JobClass);
          } else if (
            user.currentGroups.some((g) =>
              this.accessGroups?.updateJobPrivileged.includes(g),
            )
          ) {
            /**
             * User belonging to UPDATE_JOB_PRIVILEGED_GROUPS
             */
            can(Action.JobRead, JobClass);
            can(Action.JobUpdate, JobClass);
          } else {
            /**
             * Authenticated user not belonging to special group
             */
            const ownerUserScope = {
              ownerUser: user.username,
              ...typeScope,
            };
            const ownerGroupScope = {
              ownerGroup: { $in: user.currentGroups },
              ...typeScope,
            };

            const createAuthorizationValues = [
              ...Object.values(CreateJobAuth).filter(
                (v) => String(v) !== "#jobAdmin",
              ),
              ...user.currentGroups.map((g) => "@" + g),
              user.username,
            ];
            if (
              createAuthorizationValues.some((a) => jobConfig.create.auth === a)
            ) {
              can(Action.JobCreate, JobClass, typeScope);
            }

            can(Action.JobRead, JobClass, ownerGroupScope);
            can(Action.JobRead, JobClass, ownerUserScope);

            const updateAuthorizationValues = [
              ...Object.values(UpdateJobAuth).filter(
                (v) => String(v) !== "#jobAdmin",
              ),
              ...user.currentGroups.map((g) => "@" + g),
              user.username,
            ];

            let updateScope;
            switch (jobConfig.update.auth) {
              case "#jobOwnerUser":
                updateScope = ownerUserScope;
                break;
              case "#jobOwnerGroup":
                updateScope = ownerGroupScope;
                break;
              default:
                updateScope = typeScope;
                break;
            }

            if (
              updateAuthorizationValues.some((a) => jobConfig.update.auth === a)
            ) {
              can(Action.JobUpdate, JobClass, updateScope);
            }
          }
        }
      },
    );

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  logbookAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (user) {
      /**
       * Authenticated user not belonging to special group
       */
      can(Action.Read, Logbook);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  metadataKeyAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
       * Unauthenticated user
       */
      can(Action.MetadataKeysRead, MetadataKeyClass, {
        isPublished: true,
      });
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.MetadataKeysRead, MetadataKeyClass);
      } else {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.MetadataKeysRead, MetadataKeyClass, {
          userGroups: { $in: user.currentGroups },
        });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  opensearchAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (
      user &&
      user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
    ) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.Manage, Opensearch);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  origDatablockAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
       * Unauthenticated user
       */
      can(Action.OrigdatablockRead, OrigDatablock, {
        isPublished: true,
      });
      can(Action.DatasetOrigdatablockRead, OrigDatablock, {
        isPublished: true,
      });
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.OrigdatablockDelete, OrigDatablock);
      }
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.AccessAny, OrigDatablock);

        can(Action.OrigdatablockCreate, OrigDatablock);
        can(Action.OrigdatablockRead, OrigDatablock);
        can(Action.OrigdatablockUpdate, OrigDatablock);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createDatasetPrivileged.includes(g),
        )
      ) {
        /**
         * User belonging to CREATE_DATASET_PRIVILEGED_GROUPS
         */
        can(Action.OrigdatablockCreate, OrigDatablock);

        can(Action.OrigdatablockRead, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.OrigdatablockRead, OrigDatablock, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.OrigdatablockRead, OrigDatablock, {
          isPublished: true,
        });

        can(Action.OrigdatablockUpdate, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createDatasetWithPid.includes(g),
        ) ||
        this.accessGroups?.createDatasetWithPid.includes("#all")
      ) {
        /**
         * User belonging to CREATE_DATASET_WITH_PID_GROUPS
         */
        can(Action.OrigdatablockCreate, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.OrigdatablockRead, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.OrigdatablockRead, OrigDatablock, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.OrigdatablockRead, OrigDatablock, {
          isPublished: true,
        });

        can(Action.OrigdatablockUpdate, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createDataset.includes(g),
        ) ||
        this.accessGroups?.createDataset.includes("#all")
      ) {
        /**
         * User belonging to CREATE_DATASET_GROUPS
         */
        can(Action.OrigdatablockCreate, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.OrigdatablockRead, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.OrigdatablockRead, OrigDatablock, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.OrigdatablockRead, OrigDatablock, {
          isPublished: true,
        });

        can(Action.OrigdatablockUpdate, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.OrigdatablockRead, OrigDatablock, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.OrigdatablockRead, OrigDatablock, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.OrigdatablockRead, OrigDatablock, {
          isPublished: true,
        });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  policyAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    if (user) {
      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.Delete, Policy);
      }
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */

        can(Action.Create, Policy);
        can(Action.Read, Policy);
        can(Action.Update, Policy);
      } else if (
        user.currentGroups.some((g) => this.accessGroups?.policy.includes(g))
      ) {
        /**
         * User belonging to POLICY_GROUPS
         */
        can(Action.Create, Policy);
        can(Action.Read, Policy);
        can(Action.Update, Policy);
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  proposalAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
       * Unauthenticated user
       */
      can(Action.ProposalRead, ProposalClass, {
        isPublished: true,
      });
      can(Action.ProposalAttachmentRead, ProposalClass, {
        isPublished: true,
      });
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.ProposalDelete, ProposalClass);
      }

      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.AccessAny, ProposalClass);

        can(Action.ProposalCreate, ProposalClass);
        can(Action.ProposalRead, ProposalClass);
        can(Action.ProposalUpdate, ProposalClass);

        can(Action.ProposalAttachmentCreate, ProposalClass);
        can(Action.ProposalAttachmentRead, ProposalClass);
        can(Action.ProposalAttachmentUpdate, ProposalClass);
        can(Action.ProposalAttachmentDelete, ProposalClass);
      } else if (
        user.currentGroups.some((g) => {
          return this.accessGroups?.proposal.includes(g);
        })
      ) {
        /**
         * User belonging to PROPOSAL_GROUPS
         */
        can(Action.AccessAny, ProposalClass);

        can(Action.ProposalCreate, ProposalClass);
        can(Action.ProposalRead, ProposalClass);
        can(Action.ProposalUpdate, ProposalClass);

        can(Action.ProposalAttachmentCreate, ProposalClass);
        can(Action.ProposalAttachmentRead, ProposalClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.ProposalAttachmentRead, ProposalClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.ProposalAttachmentRead, ProposalClass, {
          isPublished: true,
        });
        can(Action.ProposalAttachmentUpdate, ProposalClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.ProposalAttachmentDelete, ProposalClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (user) {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.ProposalRead, ProposalClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.ProposalRead, ProposalClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.ProposalRead, ProposalClass, {
          isPublished: true,
        });

        can(Action.ProposalAttachmentRead, ProposalClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.ProposalAttachmentRead, ProposalClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.ProposalAttachmentRead, ProposalClass, {
          isPublished: true,
        });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  publishedDataAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (user) {
      can(Action.Create, PublishedData);
      can(Action.Read, PublishedData);
      can(Action.Update, PublishedData);

      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.Delete, PublishedData);
      }

      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.AccessAny, PublishedData);
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  runtimeConfigAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    can(Action.RuntimeConfigRead, RuntimeConfig);
    if (
      user &&
      user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
    ) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.RuntimeConfigUpdate, RuntimeConfig);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  sampleAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
       * Unauthenticated user
       */
      can(Action.SampleRead, SampleClass, {
        isPublished: true,
      });
      can(Action.SampleAttachmentRead, SampleClass, {
        isPublished: true,
      });
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
      ) {
        /**
         * User belonging to DELETE_GROUPS
         */
        can(Action.SampleDelete, SampleClass);
        can(Action.SampleAttachmentDelete, SampleClass);
      }

      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.AccessAny, SampleClass);

        can(Action.SampleCreate, SampleClass);
        can(Action.SampleRead, SampleClass);
        can(Action.SampleUpdate, SampleClass);

        can(Action.SampleAttachmentCreate, SampleClass);
        can(Action.SampleAttachmentRead, SampleClass);
        can(Action.SampleAttachmentUpdate, SampleClass);
        can(Action.SampleAttachmentDelete, SampleClass);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.samplePrivileged.includes(g),
        )
      ) {
        /**
         * User belonging to SAMPLE_PRIVILEGED_GROUPS
         */
        can(Action.SampleCreate, SampleClass);
        can(Action.SampleRead, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleRead, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleRead, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleUpdate, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.SampleAttachmentCreate, SampleClass);
        can(Action.SampleAttachmentRead, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentRead, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentRead, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleAttachmentUpdate, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentDelete, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else if (
        user.currentGroups.some((g) => this.accessGroups?.sample.includes(g)) ||
        this.accessGroups?.sample.includes("#all")
      ) {
        /**
         * User belonging to SAMPLE_GROUPS
         */
        can(Action.SampleCreate, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleRead, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleRead, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleRead, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleUpdate, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });

        can(Action.SampleAttachmentCreate, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentRead, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentRead, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentRead, SampleClass, {
          isPublished: true,
        });
        can(Action.SampleAttachmentUpdate, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentDelete, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
      } else {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.SampleRead, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleRead, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleRead, SampleClass, {
          isPublished: true,
        });

        can(Action.SampleAttachmentRead, SampleClass, {
          ownerGroup: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentRead, SampleClass, {
          accessGroups: { $in: user.currentGroups },
        });
        can(Action.SampleAttachmentRead, SampleClass, {
          isPublished: true,
        });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  userAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (user) {
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * User belonging to ADMIN_GROUPS
         */
        can(Action.AccessAny, User);

        can(Action.UserCreate, User);
        can(Action.UserRead, User);
        can(Action.UserUpdate, User);
        can(Action.UserDelete, User);
        can(Action.UserCreateJwt, User);
      } else {
        /**
         * Authenticated user not belonging to special group
         */
        can(Action.UserCreate, User, { _id: user._id });
        can(Action.UserRead, User, { _id: user._id });
        can(Action.UserUpdate, User, { _id: user._id });
        can(Action.UserDelete, User, { _id: user._id });
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
