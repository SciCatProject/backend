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
import { Datablock } from "src/datablocks/schemas/datablock.schema";

@Injectable()
export class DatablockAbility {
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
      can(Action.AccessAny, Datablock);

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
}
