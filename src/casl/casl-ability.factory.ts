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
import { JobConfig } from "src/config/job-config/jobconfig.interface";
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
import { accessibleBy } from "@casl/mongoose";
import { MetadataKeyClass } from "src/metadata-keys/schemas/metadatakey.schema";
import { Opensearch } from "src/opensearch/opensearch.subject";

type Subjects =
  | string
  | InferSubjects<
      | typeof Attachment
      | typeof Datablock
      | typeof DatasetClass
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
    instruments: this.instrumentAccess,
    logbooks: this.logbookAccess,
    metadataKeys: this.metadataKeyAccess,
    opensearch: this.opensearchAccess,
    origdatablocks: this.origDatablockAccess,
    policies: this.policyAccess,
    proposals: this.proposalAccess,
    runtimeconfig: this.runtimeConfigAccess,
    samples: this.sampleAccess,
    users: this.userAccess,

    jobs: this.jobsEndpointAccess,
    publisheddata: this.publishedDataEndpointAccess,
    history: this.historyEndpointAccess,
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

  instrumentAccess(user:JWTUser) {
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

  logbookAccess(user:JWTUser) {
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

  metadataKeyAccess(user:JWTUser) {
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

  opensearchAccess(user:JWTUser) {
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
  
  origDatablockAccess(user:JWTUser) {
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

  policyAccess(user:JWTUser) {
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

  proposalAccess(user:JWTUser) {
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

  publishedDataAccess(user:JWTUser) {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    
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

  sampleAccess(user:JWTUser) {
    const { can, cannot, build } = new AbilityBuilder(
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
         * User belonging to SAMPLE_PRIVILEGED_GROUPS
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

  userAccess(user:JWTUser) {
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

  /**
   * Controls user access to the history endpoints based on role-based permissions.
   *
   * This method implements the authorization logic for accessing history records across
   * different collections (e.g., Dataset, Proposal, Sample). It follows a hierarchical
   * permission structure where:
   *
   * 1. Unauthenticated users have no access to any history
   * 2. Administrators have unrestricted access to all history records
   * 3. Regular users have access only to history for collections relevant to their role
   *
   * The third parameter in the permission definitions is particularly important:
   * - For admin users: "ALL" indicates access to all collections
   * - For specialized users: Collection name (e.g., "Dataset", "Proposal", "Sample")
   *   restricts access to only that specific collection
   *
   * When a history request is made, the controller should verify the user has
   * permission to access the requested collection by checking:
   * `ability.can(Action.HistoryRead, "GenericHistory", collectionName)`
   *
   * @param user - The authenticated user object from the JWT token
   * @returns An AppAbility object that can be used to check history access permissions
   *
   * @example
   * // In a controller:
   * const ability = this.caslFactory.historyEndpointAccess(request.user);
   * if (!ability.can(Action.HistoryRead, "GenericHistory", "Dataset")) {
   *   throw new ForbiddenException("No access to Dataset history");
   * }
   *
   * @security This method is critical for enforcing access control to potentially
   * sensitive history data. Any changes should be carefully tested to ensure proper
   * access restrictions are maintained.
   */
  historyEndpointAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (user) {
      // -------------------------------------
      // Authenticated users
      // -------------------------------------
      if (user.currentGroups && Array.isArray(user.currentGroups)) {
        // Admin users get full endpoint access
        if (
          user.currentGroups.some(
            (g) =>
              this.accessGroups?.admin && this.accessGroups.admin.includes(g),
          )
        ) {
          can(Action.HistoryReadEndpoint, "GenericHistory");
        }

        // Users with access to any specific history type get endpoint access
        if (
          user.currentGroups.some((g) =>
            this.accessGroups?.historyDataset.includes(g),
          ) ||
          user.currentGroups.some((g) =>
            this.accessGroups?.historyProposal.includes(g),
          ) ||
          user.currentGroups.some((g) =>
            this.accessGroups?.historySample.includes(g),
          ) ||
          user.currentGroups.some((g) =>
            this.accessGroups?.historyInstrument.includes(g),
          ) ||
          user.currentGroups.some((g) =>
            this.accessGroups?.historyPublishedData.includes(g),
          ) ||
          user.currentGroups.some((g) =>
            this.accessGroups?.historyPolicies.includes(g),
          ) ||
          user.currentGroups.some((g) =>
            this.accessGroups?.historyDatablocks.includes(g),
          ) ||
          user.currentGroups.some((g) =>
            this.accessGroups?.historyAttachments.includes(g),
          )
        ) {
          can(Action.HistoryReadEndpoint, "GenericHistory");
        }
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  /**
   * Controls access to specific history instances
   * This checks if a user can access history for specific entity instances
   *
   * @param user - The authenticated user object from the JWT token
   * @returns An AppAbility object that can be used to check history access permissions
   *
   * @example
   * // In a controller:
   * const ability = this.caslFactory.historyInstanceAccess(request.user);
   * if (!ability.can(Action.HistoryRead, "GenericHistory", instanceId)) {
   *   throw new ForbiddenException("No access to instance history");
   * }
   *
   * @security This method is critical for enforcing access control to potentially
   * sensitive history data. Any changes should be carefully tested to ensure proper
   * access restrictions are maintained.
   */
  historyInstanceAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (user) {
      // -------------------------------------
      // Authenticated users
      // -------------------------------------
      if (user && user.currentGroups && Array.isArray(user.currentGroups)) {
        // -----------------------------------
        // Valid user groups
        // -----------------------------------
        if (
          // ---------------------------------
          // Grant full access to admin users
          // ---------------------------------
          user.currentGroups.some(
            (g) =>
              this.accessGroups?.admin && this.accessGroups.admin.includes(g),
          )
        ) {
          can(Action.HistoryReadDataset, "GenericHistory");
          can(Action.HistoryReadProposal, "GenericHistory");
          can(Action.HistoryReadSample, "GenericHistory");
          can(Action.HistoryReadInstrument, "GenericHistory");
          can(Action.HistoryReadPublishedData, "GenericHistory");
          can(Action.HistoryReadPolicy, "GenericHistory");
          can(Action.HistoryReadDatablock, "GenericHistory");
          can(Action.HistoryReadAttachment, "GenericHistory");
        } else {
          // ---------------------------------
          // Grant access based on user groups
          // ---------------------------------
          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.historyDataset.includes(g),
            )
          ) {
            can(Action.HistoryReadDataset, "GenericHistory");
          }

          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.historyProposal.includes(g),
            )
          ) {
            can(Action.HistoryReadProposal, "GenericHistory");
          }

          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.historySample.includes(g),
            )
          ) {
            can(Action.HistoryReadSample, "GenericHistory");
          }

          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.historyInstrument.includes(g),
            )
          ) {
            can(Action.HistoryReadInstrument, "GenericHistory");
          }

          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.historyPublishedData.includes(g),
            )
          ) {
            can(Action.HistoryReadPublishedData, "GenericHistory");
          }

          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.historyPolicies.includes(g),
            )
          ) {
            can(Action.HistoryReadPolicy, "GenericHistory");
          }

          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.historyDatablocks.includes(g),
            )
          ) {
            can(Action.HistoryReadDatablock, "GenericHistory");
          }

          if (
            user.currentGroups.some((g) =>
              this.accessGroups?.historyAttachments.includes(g),
            )
          ) {
            can(Action.HistoryReadAttachment, "GenericHistory");
          }
        }
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  jobsEndpointAccess(user: JWTUser) {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
       * unauthenticated users
       */

      // job creation
      if (
        Object.values(this.jobConfigService.allJobConfigs).some(
          (j) =>
            j.create.auth == CreateJobAuth.All ||
            j.create.auth == CreateJobAuth.DatasetPublic,
        )
      ) {
        can(Action.JobCreate, JobClass);
      } else {
        cannot(Action.JobCreate, JobClass);
      }
      cannot(Action.JobRead, JobClass);
      if (
        Object.values(this.jobConfigService.allJobConfigs).some(
          (j) => j.update.auth == UpdateJobAuth.All,
        )
      ) {
        can(Action.JobUpdate, JobClass);
      } else {
        cannot(Action.JobUpdate, JobClass);
      }
      cannot(Action.JobDelete, JobClass);
    } else {
      /**
       * authenticated users
       */
      // check if this user is part of the admin group
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * authenticated users belonging to any of the group listed in ADMIN_GROUPS
         */
        can(Action.JobRead, JobClass);
        can(Action.JobCreate, JobClass);
        can(Action.JobUpdate, JobClass);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createJobPrivileged.includes(g),
        )
      ) {
        /**
         * authenticated users belonging to any of the group listed in CREATE_JOB_PRIVILEGED_GROUPS
         */
        can(Action.JobRead, JobClass);
        can(Action.JobCreate, JobClass);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.updateJobPrivileged.includes(g),
        )
      ) {
        can(Action.JobRead, JobClass);
        can(Action.JobUpdate, JobClass);
      } else {
        const jobUserAuthorizationValues = [
          ...user.currentGroups.map((g) => "@" + g),
          user.username,
        ];

        /**
         * authenticated users not belonging to any special group
         */
        const jobCreateEndPointAuthorizationValues = [
          ...Object.values(CreateJobAuth),
          ...jobUserAuthorizationValues,
        ];
        can(Action.JobRead, JobClass);

        if (
          Object.values(this.jobConfigService.allJobConfigs).some(
            (j) =>
              j.create.auth &&
              jobCreateEndPointAuthorizationValues.includes(
                j.create.auth as string,
              ),
          )
        ) {
          can(Action.JobCreate, JobClass);
        }

        const jobUpdateEndPointAuthorizationValues = [
          ...Object.values(UpdateJobAuth),
          ...jobUserAuthorizationValues,
        ];

        if (
          Object.values(this.jobConfigService.allJobConfigs).some(
            (j) =>
              j.update.auth &&
              jobUpdateEndPointAuthorizationValues.includes(
                j.update.auth as string,
              ),
          )
        ) {
          can(Action.JobUpdate, JobClass);
        }
      }
      if (
        user.currentGroups.some((g) => this.accessGroups?.deleteJob.includes(g))
      ) {
        /**
         * authenticated users belonging to any of the group listed in DELETE_JOB_GROUPS
         */
        can(Action.JobDelete, JobClass);
      } else {
        cannot(Action.JobDelete, JobClass);
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  publishedDataEndpointAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    if (user) {
      can(Action.Read, PublishedData);
      can(Action.Update, PublishedData);
      can(Action.Create, PublishedData);
    }

    if (
      user &&
      user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
    ) {
      /*
        / user that belongs to any of the group listed in DELETE_GROUPS
        */
      can(Action.Delete, PublishedData);
    }
    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  jobsInstanceAccessCan(
    can: AbilityBuilder<AppAbility>["can"],
    user: JWTUser,
    jobConfiguration: JobConfig,
    jobType?: string,
  ) {
    const typeScope = jobType ? { type: jobType } : {};

    if (!user) {
      /**
       * unauthenticated users
       */
      if (jobConfiguration.create.auth === CreateJobAuth.All) {
        can(Action.JobCreateConfiguration, JobClass, typeScope);
      }
      if (jobConfiguration.create.auth === CreateJobAuth.DatasetPublic) {
        can(Action.JobCreateConfiguration, JobClass, typeScope);
      }
      if (jobConfiguration.update.auth === UpdateJobAuth.All) {
        can(Action.JobUpdateConfiguration, JobClass, {
          ownerGroup: undefined,
          ...typeScope,
        });
      }
    } else {
      /**
       * authenticated users
       */
      // check if this user is part of the admin group
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /**
         * authenticated users belonging to any of the group listed in ADMIN_GROUPS
         */
        can(Action.JobReadAny, JobClass);
        can(Action.JobCreateAny, JobClass);
        can(Action.JobUpdateAny, JobClass);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.createJobPrivileged.includes(g),
        )
      ) {
        can(Action.JobReadAny, JobClass);
        can(Action.JobCreateAny, JobClass);
      } else if (
        user.currentGroups.some((g) =>
          this.accessGroups?.updateJobPrivileged.includes(g),
        )
      ) {
        can(Action.JobUpdateAny, JobClass);
        can(Action.JobReadAny, JobClass);
      } else {
        /**
         * authenticated users not belonging to any special group
         */
        const jobUserAuthorizationValues = [
          ...user.currentGroups.map((g) => "@" + g),
          user.username,
        ];
        can(Action.JobReadAccess, JobClass, {
          ownerGroup: { $in: user.currentGroups },
          ...typeScope,
        });
        can(Action.JobReadAccess, JobClass, {
          ownerUser: user.username,
          ...typeScope,
        });

        const jobCreateInstanceAuthorizationValues = [
          ...Object.values(CreateJobAuth).filter(
            (v) => !String(v).includes("#dataset"),
          ),
          ...jobUserAuthorizationValues,
        ];
        const jobCreateDatasetAuthorizationValues = [
          ...Object.values(CreateJobAuth).filter((v) =>
            String(v).includes("#dataset"),
          ),
        ];

        if (
          jobCreateInstanceAuthorizationValues.some(
            (a) => jobConfiguration.create.auth === a,
          )
        ) {
          can(Action.JobCreateConfiguration, JobClass, typeScope);
        }
        if (
          jobCreateDatasetAuthorizationValues.some(
            (a) => jobConfiguration.create.auth === a,
          )
        ) {
          can(Action.JobCreateConfiguration, JobClass, typeScope);
        }

        const jobUpdateInstanceAuthorizationValues = [
          ...Object.values(UpdateJobAuth).filter(
            (v) => !String(v).includes("#job"),
          ),
          ...jobUserAuthorizationValues,
        ];
        if (
          jobUpdateInstanceAuthorizationValues.some(
            (a) => jobConfiguration.update.auth === a,
          )
        ) {
          can(Action.JobUpdateConfiguration, JobClass, typeScope);
        }
        if (jobConfiguration.update.auth === "#jobOwnerUser") {
          can(Action.JobUpdateConfiguration, JobClass, {
            ownerUser: user.username,
            ...typeScope,
          });
        }
        if (jobConfiguration.update.auth === "#jobOwnerGroup") {
          can(Action.JobUpdateConfiguration, JobClass, {
            ownerGroup: { $in: user.currentGroups },
            ...typeScope,
          });
        }
      }
    }
  }

  jobsInstanceAccess(user: JWTUser, jobConfiguration: JobConfig) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    this.jobsInstanceAccessCan(can, user, jobConfiguration);
    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  jobsAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    Object.entries(this.jobConfigService.allJobConfigs).forEach(
      ([jobType, jobConfig]) => {
        this.jobsInstanceAccessCan(can, user, jobConfig, jobType);
      },
    );
    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  jobsMongoQueryReadAccess(user: JWTUser) {
    const abilities = this.jobsAccess(user);
    return {
      $or: [
        accessibleBy(abilities, Action.JobReadAny).ofType(JobClass),
        accessibleBy(abilities, Action.JobReadAccess).ofType(JobClass),
      ],
    };
  }

  publishedDataInstanceAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (
      user &&
      user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
    ) {
      // -------------------------------------
      // users belonging to any of the group listed in ADMIN_GROUPS
      // -------------------------------------

      can(Action.AccessAny, PublishedData);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
