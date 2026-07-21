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
import { PublishedData } from "src/published-data/schemas/published-data.schema";

@Injectable()
export class PublishedDataAbility {
  private accessGroups?: AccessGroupsType;
  constructor(private configService: ConfigService) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups") ??
      ({} as AccessGroupsType);
  }

  buildAbility(
    user: JWTUser | null,
  ): MongoAbility<PossibleAbilities, Conditions> {
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

    if (user.currentGroups.some((g) => this.accessGroups?.admin?.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.AccessAny, PublishedData);
    }

    if (
      user.currentGroups.some((g) => this.accessGroups?.delete?.includes(g))
    ) {
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
}
