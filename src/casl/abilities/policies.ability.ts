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
import { Policy } from "src/policies/schemas/policy.schema";

@Injectable()
export class PolicyAbility {
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
}
