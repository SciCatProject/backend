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
import { ProposalClass } from "src/proposals/schemas/proposal.schema";

@Injectable()
export class ProposalAbility {
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
}
