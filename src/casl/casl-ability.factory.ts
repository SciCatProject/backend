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
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";
import { User } from "src/users/schemas/user.schema";
import { Action } from "./action.enum";
import { Subjects, PossibleAbilities, Conditions } from "./types/casl-subjects";
import { AttachmentAbility } from "./abilities/attachments.ability";
import { DatablockAbility } from "./abilities/datablocks.ability";
import { DatasetAbility } from "./abilities/datasets.ability";
import { InstrumentAbility } from "./abilities/instruments.ability";
import { JobAbility } from "./abilities/jobs.ability";
import { LogbookAbility } from "./abilities/logbooks.ability";
import { MetadataKeyAbility } from "./abilities/metadata-keys.ability";
import { OpensearchAbility } from "./abilities/opensearch.ability";
import { OrigDatablockAbility } from "./abilities/origdatablocks.ability";
import { PolicyAbility } from "./abilities/policies.ability";
import { ProposalAbility } from "./abilities/proposals.ability";
import { RuntimeConfigAbility } from "./abilities/runtime-config.ability";

export type AppAbility = MongoAbility<PossibleAbilities, Conditions>;

@Injectable()
export class CaslAbilityFactory {
  constructor(
    private configService: ConfigService,
    private attachmentAbility: AttachmentAbility,
    private datablockAbility: DatablockAbility,
    private datasetAbility: DatasetAbility,
    private instrumentAbility: InstrumentAbility,
    private jobAbility: JobAbility,
    private logbookAbility: LogbookAbility,
    private metadataKeyAbility: MetadataKeyAbility,
    private opensearchAbility: OpensearchAbility,
    private origDatablockAbility: OrigDatablockAbility,
    private policyAbility: PolicyAbility,
    private proposalAbility: ProposalAbility,
    private runtimeConfigAbility: RuntimeConfigAbility,
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
    history: this.historyEndpointAccess,
    instruments: this.instrumentAccess,
    jobs: this.jobAccess,
    logbooks: this.logbookAccess,
    metadataKeys: this.metadataKeyAccess,
    opensearch: this.opensearchAccess,
    origdatablocks: this.origDatablockAccess,
    policies: this.policyAccess,
    proposals: this.proposalAccess,
    publisheddata: this.publishedDataEndpointAccess,
    runtimeconfig: this.runtimeConfigAccess,
    samples: this.samplesEndpointAccess,
    users: this.userEndpointAccess,
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

  runtimeConfigAccess(user: JWTUser | null) {
    return this.runtimeConfigAbility.buildAbility(user);
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

  userEndpointAccess(user: JWTUser) {
    const { can, cannot, build } = new AbilityBuilder(
      createMongoAbility<PossibleAbilities, Conditions>,
    );

    if (!user) {
      /**
      /*  unauthenticated users
      **/

      cannot(Action.UserReadOwn, User);
      cannot(Action.UserCreateOwn, User);
      cannot(Action.UserUpdateOwn, User);
      cannot(Action.UserDeleteOwn, User);
      cannot(Action.UserReadAny, User);
      cannot(Action.UserCreateAny, User);
      cannot(Action.UserUpdateAny, User);
      cannot(Action.UserDeleteAny, User);
    } else {
      if (
        user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))
      ) {
        /*
        / user that belongs to any of the group listed in ADMIN_GROUPS
        */

        // can(Action.ReadAll, UserIdentity); NOT used?

        // -------------------------------------
        // user endpoint, including useridentity
        can(Action.UserReadAny, User);
        can(Action.UserReadOwn, User);
        can(Action.UserCreateAny, User);
        can(Action.UserUpdateAny, User);
        can(Action.UserDeleteAny, User);
        can(Action.UserCreateJwt, User);
        can(Action.UserListAll, User);

        // -------------------------------------
      } else if (user) {
        /**
        /*  authenticated users
        **/
        cannot(Action.UserReadAny, User);
        cannot(Action.UserCreateAny, User);
        cannot(Action.UserUpdateAny, User);
        cannot(Action.UserDeleteAny, User);
        cannot(Action.UserCreateJwt, User);
        cannot(Action.UserListAll, User);
      }
      can(Action.UserReadOwn, User, { _id: user._id });
      can(Action.UserCreateOwn, User, { _id: user._id });
      can(Action.UserUpdateOwn, User, { _id: user._id });
      can(Action.UserDeleteOwn, User, { _id: user._id });
      can(Action.UserListOwn, User);
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
