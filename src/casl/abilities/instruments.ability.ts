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
import { Instrument } from "src/instruments/schemas/instrument.schema";

@Injectable()
export class InstrumentAbility {
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
    can(Action.Read, Instrument);

    if (!user) {
      return build({
        detectSubjectType: (item) =>
          item.constructor as ExtractSubjectType<Subjects>,
      });
    }

    /**
     * Authenticated user
     */
    can(Action.Read, Instrument);

    if (user.currentGroups.some((g) => this.accessGroups?.admin?.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.Create, Instrument);
      can(Action.Update, Instrument);
    }

    if (
      user.currentGroups.some((g) => this.accessGroups?.delete?.includes(g))
    ) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.Delete, Instrument);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
