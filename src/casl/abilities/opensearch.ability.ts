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
import { Opensearch } from "src/opensearch/opensearch.subject";

@Injectable()
export class OpensearchAbility {
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

    if (
      user &&
      user.currentGroups.some((g) => this.accessGroups?.admin?.includes(g))
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
}
