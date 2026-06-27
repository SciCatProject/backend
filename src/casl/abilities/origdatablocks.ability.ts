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
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";

@Injectable()
export class OrigDatablockAbility {
  constructor(private configService: ConfigService) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
  }
  private accessGroups;

  buildAbility(user: JWTUser): MongoAbility<PossibleAbilities, Conditions> {
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
}
