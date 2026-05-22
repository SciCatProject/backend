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
    const ifPublished = { isPublished: true };

    /**
     * Unauthenticated user
     */
    can(Action.AttachmentRead, Attachment, ifPublished);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const ifOwner = { ownerGroup: { $in: user.currentGroups } };
    const ifAccess = { accessGroups: { $in: user.currentGroups } };

    /**
     * Authenticated user
     */
    can(Action.AttachmentRead, Attachment, ifOwner);
    can(Action.AttachmentRead, Attachment, ifAccess);
    can(Action.AttachmentRead, Attachment, ifPublished);

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.attachment.includes(g),
      ) ||
      this.accessGroups?.attachment.includes("#all")
    ) {
      /**
       * User belonging to ATTACHMENT_GROUPS
       */
      can(Action.AttachmentCreate, Attachment, ifOwner);
      can(Action.AttachmentUpdate, Attachment, ifOwner);
      can(Action.AttachmentDelete, Attachment, ifOwner);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.attachmentPrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to ATTACHMENT_PRIVILEGED_GROUPS
       */
      can(Action.AttachmentCreate, Attachment);
      can(Action.AttachmentUpdate, Attachment, ifOwner);
      can(Action.AttachmentDelete, Attachment, ifOwner);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.AccessAny, Attachment);

      can(Action.AttachmentCreate, Attachment);
      can(Action.AttachmentRead, Attachment);
      can(Action.AttachmentUpdate, Attachment);
      can(Action.AttachmentDelete, Attachment);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.AttachmentDelete, Attachment);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  // TODO: The access rights granted depending on group are irregular
  datablockAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    const ifPublished = { isPublished: true };

    /**
     * Unauthenticated user
     */
    can(Action.DatablockRead, Datablock, ifPublished);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const ifOwner = { ownerGroup: { $in: user.currentGroups } };
    const ifAccess = { accessGroups: { $in: user.currentGroups } };

    /**
     * Authenticated user
     */
    can(Action.DatablockRead, Datablock, ifOwner);
    can(Action.DatablockRead, Datablock, ifAccess);
    can(Action.DatablockRead, Datablock, ifPublished);

    can(Action.DatablockUpdate, Datablock, ifOwner);

    if (
      user.currentGroups.some(
        (g) =>
          this.accessGroups?.createDatasetPrivileged.includes(g) ||
          this.accessGroups?.createDatasetWithPid.includes(g) ||
          this.accessGroups?.createDataset.includes(g),
      )
    ) {
      /**
       * User belonging to CREATE_DATASET_PRIVILEGED_GROUPS,
       * CREATE_DATASET_WITH_PID_GROUPS or CREATE_DATASET_GROUPS
       */
      can(Action.DatablockCreate, Datablock);
      can(Action.DatablockUpdate, Datablock);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.DatablockCreate, Datablock);
      can(Action.DatablockRead, Datablock);
      can(Action.DatablockUpdate, Datablock);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.DatablockRead, Datablock);
      can(Action.DatablockUpdate, Datablock);
      can(Action.DatablockDelete, Datablock);
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
    const ifPublished = { isPublished: true };

    /**
     * Unauthenticated user
     */
    can(Action.DatasetRead, DatasetClass, ifPublished);
    can(Action.DatasetAttachmentRead, DatasetClass, ifPublished);
    can(Action.DatasetDatablockRead, DatasetClass, ifPublished);
    can(Action.DatasetOrigdatablockRead, DatasetClass, ifPublished);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const ifOwner = { ownerGroup: { $in: user?.currentGroups } };
    const ifAccess = { accessGroups: { $in: user?.currentGroups } };

    /**
     * Authenticated user
     */
    can(Action.DatasetRead, DatasetClass, ifOwner);
    can(Action.DatasetRead, DatasetClass, ifAccess);
    can(Action.DatasetRead, DatasetClass, ifPublished);

    can(Action.DatasetAttachmentRead, DatasetClass, ifOwner);
    can(Action.DatasetAttachmentRead, DatasetClass, ifAccess);
    can(Action.DatasetAttachmentRead, DatasetClass, ifPublished);

    can(Action.DatasetDatablockRead, DatasetClass, ifOwner);
    can(Action.DatasetDatablockRead, DatasetClass, ifAccess);
    can(Action.DatasetDatablockRead, DatasetClass, ifPublished);

    can(Action.DatasetOrigdatablockRead, DatasetClass, ifOwner);
    can(Action.DatasetOrigdatablockRead, DatasetClass, ifAccess);
    can(Action.DatasetOrigdatablockRead, DatasetClass, ifPublished);

    can(Action.DatasetLogbookRead, DatasetClass, ifOwner);

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.createDataset.includes(g),
      ) ||
      this.accessGroups?.createDataset.includes("#all")
    ) {
      /**
       * User belonging to CREATE_DATASET_GROUPS
       */
      can(Action.DatasetCreate, DatasetClass, {
        ...ifOwner,
        pid: { $eq: "" },
      });
      can(Action.DatasetUpdate, DatasetClass, ifOwner);
      can(Action.DatasetLifecycleUpdate, DatasetClass, ifOwner);

      can(Action.DatasetAttachmentCreate, DatasetClass, ifOwner);
      can(Action.DatasetAttachmentUpdate, DatasetClass, ifOwner);
      can(Action.DatasetAttachmentDelete, DatasetClass, ifOwner);

      can(Action.DatasetDatablockCreate, DatasetClass, ifOwner);
      can(Action.DatasetDatablockUpdate, DatasetClass, ifOwner);

      can(Action.DatasetOrigdatablockCreate, DatasetClass, ifOwner);
      can(Action.DatasetOrigdatablockUpdate, DatasetClass, ifOwner);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.createDatasetWithPid.includes(g),
      ) ||
      this.accessGroups?.createDatasetWithPid.includes("#all")
    ) {
      /**
       * User belonging to CREATE_DATASET_WITH_PID_GROUPS
       */
      can(Action.DatasetCreate, DatasetClass, ifOwner);
      can(Action.DatasetUpdate, DatasetClass, ifOwner);
      can(Action.DatasetLifecycleUpdate, DatasetClass, ifOwner);

      can(Action.DatasetAttachmentCreate, DatasetClass, ifOwner);
      can(Action.DatasetAttachmentUpdate, DatasetClass, ifOwner);
      can(Action.DatasetAttachmentDelete, DatasetClass, ifOwner);

      can(Action.DatasetOrigdatablockCreate, DatasetClass, ifOwner);
      can(Action.DatasetOrigdatablockUpdate, DatasetClass, ifOwner);

      can(Action.DatasetDatablockCreate, DatasetClass, ifOwner);
      can(Action.DatasetDatablockUpdate, DatasetClass, ifOwner);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.createDatasetPrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to CREATE_DATASET_PRIVILEGED_GROUPS
       */
      can(Action.DatasetCreate, DatasetClass);
      can(Action.DatasetUpdate, DatasetClass, ifOwner);
      can(Action.DatasetLifecycleUpdate, DatasetClass, ifOwner);

      can(Action.DatasetAttachmentCreate, DatasetClass);
      can(Action.DatasetAttachmentUpdate, DatasetClass, ifOwner);
      can(Action.DatasetAttachmentDelete, DatasetClass, ifOwner);

      can(Action.DatasetOrigdatablockCreate, DatasetClass);
      can(Action.DatasetOrigdatablockUpdate, DatasetClass, ifOwner);

      can(Action.DatasetDatablockCreate, DatasetClass);
      can(Action.DatasetDatablockUpdate, DatasetClass, ifOwner);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
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
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
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

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  historyAccess(user: JWTUser) {
    const { can, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    /**
     * Unauthenticated user
     */
    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyAttachments.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_ATTACHMENT_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, Attachment);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyDatablocks.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_DATABLOCK_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, Datablock);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyDataset.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_DATASET_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, DatasetClass);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyInstrument.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_INSTRUMENT_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, Instrument);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyPolicies.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_POLICIES_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, Policy);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyProposal.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_PROPOSAL_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, ProposalClass);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyPublishedData.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_PUBLISHED_DATA_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, PublishedData);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historySample.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_SAMPLE_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, SampleClass);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);

      can(Action.HistoryRead, Attachment);
      can(Action.HistoryRead, Datablock);
      can(Action.HistoryRead, DatasetClass);
      can(Action.HistoryRead, Instrument);
      can(Action.HistoryRead, Policy);
      can(Action.HistoryRead, ProposalClass);
      can(Action.HistoryRead, PublishedData);
      can(Action.HistoryRead, SampleClass);
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

    /**
     * Unauthenticated user
     */
    can(Action.InstrumentRead, Instrument);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    /**
     * Authenticated user
     */
    can(Action.InstrumentRead, Instrument);

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.InstrumentCreate, Instrument);
      can(Action.InstrumentUpdate, Instrument);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.InstrumentDelete, Instrument);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }

  jobAccess(user: JWTUser) {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );
    const allJobConfigs = this.jobConfigService.allJobConfigs;

    /**
     * Unauthenticated user
     */
    Object.entries(allJobConfigs).forEach(([jobType, jobConfig]) => {
      const matchJobType = jobType ? { type: jobType } : {};

      if (
        jobConfig.create.auth === CreateJobAuth.All ||
        jobConfig.create.auth === CreateJobAuth.DatasetPublic
      ) {
        can(Action.JobCreate, JobClass, matchJobType);
      }

      if (jobConfig.update.auth === UpdateJobAuth.All) {
        can(Action.JobUpdate, JobClass, {
          ownerGroup: undefined,
          ...matchJobType,
        });
      }
    });

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    /**
     * Authenticated user
     */
    Object.entries(allJobConfigs).forEach(([jobType, jobConfig]) => {
      const matchJobType = jobType ? { type: jobType } : {};
      const ifOwnerUser = { ownerUser: user.username };
      const ifOwnerGroup = { ownerGroup: { $in: user.currentGroups } };

      const createAuthorizationValues = [
        ...Object.values(CreateJobAuth).filter(
          (v) => String(v) !== "#jobAdmin",
        ),
        ...user.currentGroups.map((g) => "@" + g),
        user.username,
      ];
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
          updateScope = { ...ifOwnerUser, ...matchJobType };
          break;
        case "#jobOwnerGroup":
          updateScope = { ...ifOwnerGroup, ...matchJobType };
          break;
        default:
          updateScope = matchJobType;
          break;
      }

      if (createAuthorizationValues.some((a) => jobConfig.create.auth === a)) {
        can(Action.JobCreate, JobClass, matchJobType);
      }

      can(Action.JobRead, JobClass, { ...ifOwnerUser, ...matchJobType });
      can(Action.JobRead, JobClass, { ...ifOwnerGroup, ...matchJobType });

      if (updateAuthorizationValues.some((a) => jobConfig.update.auth === a)) {
        can(Action.JobUpdate, JobClass, updateScope);
      }
    });

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.createJobPrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to CREATE_JOB_PRIVILEGED_GROUPS
       */
      can(Action.JobCreate, JobClass);
      can(Action.JobRead, JobClass);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.updateJobPrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to UPDATE_JOB_PRIVILEGED_GROUPS
       */
      can(Action.JobRead, JobClass);
      can(Action.JobUpdate, JobClass);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.JobCreate, JobClass);
      can(Action.JobRead, JobClass);
      can(Action.JobUpdate, JobClass);
    }

    if (
      user.currentGroups.some((g) => this.accessGroups?.deleteJob.includes(g))
    ) {
      /**
       * User belonging to DELETE_JOB_GROUPS
       */
      can(Action.JobDelete, JobClass);
    }

    /**
     * Exclusion rules
     */
    if (
      user.currentGroups.some(
        (g) =>
          this.accessGroups?.createJobPrivileged.includes(g) &&
          !this.accessGroups?.updateJobPrivileged.includes(g) &&
          !this.accessGroups?.admin.includes(g),
      )
    ) {
      /**
       * User belonging only to CREATE_JOB_PRIVILEGED_GROUPS
       */
      cannot(Action.JobUpdate, JobClass);
    }

    if (
      user.currentGroups.some(
        (g) =>
          !this.accessGroups?.createJobPrivileged.includes(g) &&
          this.accessGroups?.updateJobPrivileged.includes(g) &&
          !this.accessGroups?.admin.includes(g),
      )
    ) {
      /**
       * User belonging only to UPDATE_JOB_PRIVILEGED_GROUPS
       */
      cannot(Action.JobCreate, JobClass);
    }

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
       * Authenticated user
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
    const ifPublished = { isPublished: true };

    /**
     * Unauthenticated user
     */
    can(Action.MetadataKeysRead, MetadataKeyClass, ifPublished);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const ifAccess = { userGroups: { $in: user.currentGroups } };

    /**
     * Authenticated user
     */
    can(Action.MetadataKeysRead, MetadataKeyClass, ifAccess);

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.MetadataKeysRead, MetadataKeyClass);
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
    const ifPublished = { isPublished: true };

    /**
     * Unauthenticated user
     */
    can(Action.OrigdatablockRead, OrigDatablock, ifPublished);
    can(Action.DatasetOrigdatablockRead, OrigDatablock, ifPublished);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const ifOwner = { ownerGroup: { $in: user.currentGroups } };
    const ifAccess = { accessGroups: { $in: user.currentGroups } };

    /**
     * Authenticated user
     */
    can(Action.OrigdatablockRead, OrigDatablock, ifOwner);
    can(Action.OrigdatablockRead, OrigDatablock, ifAccess);
    can(Action.OrigdatablockRead, OrigDatablock, ifPublished);

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.createDataset.includes(g),
      ) ||
      this.accessGroups?.createDataset.includes("#all")
    ) {
      /**
       * User belonging to CREATE_DATASET_GROUPS
       */
      can(Action.OrigdatablockCreate, OrigDatablock, ifOwner);
      can(Action.OrigdatablockUpdate, OrigDatablock, ifOwner);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.createDatasetWithPid.includes(g),
      ) ||
      this.accessGroups?.createDatasetWithPid.includes("#all")
    ) {
      /**
       * User belonging to CREATE_DATASET_WITH_PID_GROUPS
       */
      can(Action.OrigdatablockCreate, OrigDatablock, ifOwner);
      can(Action.OrigdatablockUpdate, OrigDatablock, ifOwner);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.createDatasetPrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to CREATE_DATASET_PRIVILEGED_GROUPS
       */
      can(Action.OrigdatablockCreate, OrigDatablock);
      can(Action.OrigdatablockUpdate, OrigDatablock, ifOwner);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.AccessAny, OrigDatablock);

      can(Action.OrigdatablockCreate, OrigDatablock);
      can(Action.OrigdatablockRead, OrigDatablock);
      can(Action.OrigdatablockUpdate, OrigDatablock);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.OrigdatablockDelete, OrigDatablock);
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

    if (
      user &&
      user.currentGroups.some(
        (g) =>
          this.accessGroups?.admin.includes(g) ||
          this.accessGroups?.policy.includes(g),
      )
    ) {
      /**
       * User belonging to ADMIN_GROUPS or POLICY_GROUPS
       */

      can(Action.Create, Policy);
      can(Action.Read, Policy);
      can(Action.Update, Policy);
    }

    if (
      user &&
      user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))
    ) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.Delete, Policy);
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
    const ifPublished = { isPublished: true };

    /**
     * Unauthenticated user
     */
    can(Action.ProposalRead, ProposalClass, ifPublished);
    can(Action.ProposalAttachmentRead, ProposalClass, ifPublished);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const ifOwner = { ownerGroup: { $in: user.currentGroups } };
    const ifAccess = { accessGroups: { $in: user.currentGroups } };

    /**
     * Authenticated user
     */
    can(Action.ProposalRead, ProposalClass, ifOwner);
    can(Action.ProposalRead, ProposalClass, ifAccess);
    can(Action.ProposalRead, ProposalClass, ifPublished);

    can(Action.ProposalAttachmentRead, ProposalClass, ifOwner);
    can(Action.ProposalAttachmentRead, ProposalClass, ifAccess);
    can(Action.ProposalAttachmentRead, ProposalClass, ifPublished);

    if (
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
      can(Action.ProposalAttachmentUpdate, ProposalClass, ifOwner);
      can(Action.ProposalAttachmentDelete, ProposalClass, ifOwner);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
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
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.ProposalDelete, ProposalClass);
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

    /**
     * Unauthenticated user
     */
    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    /**
     * Authenticated user
     */
    can(Action.Create, PublishedData);
    can(Action.Read, PublishedData);
    can(Action.Update, PublishedData);

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.AccessAny, PublishedData);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.Delete, PublishedData);
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

    /**
     * Any user
     */
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
    const ifPublished = { isPublished: true };

    /**
     * Unauthenticated user
     */
    can(Action.SampleRead, SampleClass, ifPublished);
    can(Action.SampleAttachmentRead, SampleClass, ifPublished);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const ifOwner = { ownerGroup: { $in: user.currentGroups } };
    const ifAccess = { accessGroups: { $in: user.currentGroups } };

    /**
     * Authenticated user
     */
    can(Action.SampleRead, SampleClass, ifOwner);
    can(Action.SampleRead, SampleClass, ifAccess);
    can(Action.SampleRead, SampleClass, ifPublished);

    can(Action.SampleAttachmentRead, SampleClass, ifOwner);
    can(Action.SampleAttachmentRead, SampleClass, ifAccess);
    can(Action.SampleAttachmentRead, SampleClass, ifPublished);

    if (
      user.currentGroups.some((g) => this.accessGroups?.sample.includes(g)) ||
      this.accessGroups?.sample.includes("#all")
    ) {
      /**
       * User belonging to SAMPLE_GROUPS
       */
      can(Action.SampleCreate, SampleClass, ifOwner);
      can(Action.SampleUpdate, SampleClass, ifOwner);

      can(Action.SampleAttachmentCreate, SampleClass, ifOwner);
      can(Action.SampleAttachmentUpdate, SampleClass, ifOwner);
      can(Action.SampleAttachmentDelete, SampleClass, ifOwner);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.samplePrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to SAMPLE_PRIVILEGED_GROUPS
       */
      can(Action.SampleCreate, SampleClass);
      can(Action.SampleUpdate, SampleClass, ifOwner);

      can(Action.SampleAttachmentCreate, SampleClass);
      can(Action.SampleAttachmentUpdate, SampleClass, ifOwner);
      can(Action.SampleAttachmentDelete, SampleClass, ifOwner);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
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
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.SampleDelete, SampleClass);
      can(Action.SampleAttachmentDelete, SampleClass);
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

    /**
     * Unauthenticated user
     */
    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    const matchUid = { _id: user._id };

    /**
     * Authenticated user
     */
    can(Action.UserCreate, User, matchUid);
    can(Action.UserRead, User, matchUid);
    can(Action.UserUpdate, User, matchUid);
    can(Action.UserDelete, User, matchUid);

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.AccessAny, User);

      can(Action.UserCreate, User);
      can(Action.UserRead, User);
      can(Action.UserUpdate, User);
      can(Action.UserDelete, User);
      can(Action.UserCreateJwt, User);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
