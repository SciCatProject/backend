import {
  AbilityBuilder,
  ExtractSubjectType,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccessGroupsType } from "src/config/configuration";
import { Action } from "../action.enum";
import {
  Subjects,
  PossibleAbilities,
  Conditions,
} from "../types/casl-subjects";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";

@Injectable()
export class DatasetAbility {
  constructor(private configService: ConfigService) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
  }
  private accessGroups?: AccessGroupsType;

  buildAbility(
    user: JWTUser | null,
  ): MongoAbility<PossibleAbilities, Conditions> {
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
}
