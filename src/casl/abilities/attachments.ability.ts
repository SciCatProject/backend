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
import { Attachment } from "src/attachments/schemas/attachment.schema";

@Injectable()
export class AttachmentAbility {
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
    const ifPublished = { isPublished: true };

    /**
     * Unauthenticated user
     */
    can(Action.AttachmentRead, Attachment, ifPublished);

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
    can(Action.AttachmentRead, Attachment, ifOwner);
    can(Action.AttachmentRead, Attachment, ifAccess);
    can(Action.AttachmentRead, Attachment, ifPublished);

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.attachment?.includes(g),
      ) ||
      this.accessGroups?.attachment?.includes("#all")
    ) {
      /**
       * User belonging to ATTACHMENT_GROUPS
       */
      can(Action.AttachmentCreate, Attachment, ifOwner);
      can(Action.AttachmentUpdate, Attachment, ifOwner);
      can(Action.AttachmentDelete, Attachment, ifOwner);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.attachmentPrivileged?.includes(g),
      )
    ) {
      /**
       * User belonging to ATTACHMENT_PRIVILEGED_GROUPS
       */
      can(Action.AttachmentCreate, Attachment);
      can(Action.AttachmentUpdate, Attachment, ifOwner);
      can(Action.AttachmentDelete, Attachment, ifOwner);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin?.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.AccessAny, Attachment);

      can(Action.AttachmentCreate, Attachment);
      can(Action.AttachmentRead, Attachment);
      can(Action.AttachmentUpdate, Attachment);
      can(Action.AttachmentDelete, Attachment);
    }

    if (
      user.currentGroups.some((g) => this.accessGroups?.delete?.includes(g))
    ) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.AttachmentDelete, Attachment);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
