import {
  AbilityBuilder,
  ExtractSubjectType,
  MongoAbility,
  createMongoAbility,
} from "@casl/ability";
import { SseClass } from "src/serverSentEvent/interfaces/sse-event.interface";
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

@Injectable()
export class SseAbility {
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

    if (user) {
      /**
       * Authenticated user
       */
      can(Action.SseRead, SseClass);
    }

    if (
      user &&
      user.currentGroups.some((g) => this.accessGroups?.admin?.includes(g))
    ) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.SseRead, SseClass);
      can(Action.AccessAny, SseClass);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
