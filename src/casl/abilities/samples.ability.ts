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
import { SampleClass } from "src/samples/schemas/sample.schema";

@Injectable()
export class SampleAbility {
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
    can(Action.SampleRead, SampleClass, ifPublished);
    can(Action.SampleAttachmentRead, SampleClass, ifPublished);

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
    can(Action.SampleRead, SampleClass, ifOwner);
    can(Action.SampleRead, SampleClass, ifAccess);
    can(Action.SampleRead, SampleClass, ifPublished);

    can(Action.SampleAttachmentRead, SampleClass, ifOwner);
    can(Action.SampleAttachmentRead, SampleClass, ifAccess);
    can(Action.SampleAttachmentRead, SampleClass, ifPublished);

    if (
      user.currentGroups.some((g) => this.accessGroups?.sample.includes(g)) ||
      this.accessGroups?.sample.includes("#all")
    ) {
      /**
       * User belonging to SAMPLE_GROUPS
       */
      can(Action.SampleCreate, SampleClass, ifOwner);
      can(Action.SampleUpdate, SampleClass, ifOwner);

      can(Action.SampleAttachmentCreate, SampleClass, ifOwner);
      can(Action.SampleAttachmentUpdate, SampleClass, ifOwner);
      can(Action.SampleAttachmentDelete, SampleClass, ifOwner);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.samplePrivileged.includes(g),
      )
    ) {
      /**
       * User belonging to SAMPLE_PRIVILEGED_GROUPS
       */
      can(Action.SampleCreate, SampleClass);
      can(Action.SampleUpdate, SampleClass, ifOwner);

      can(Action.SampleAttachmentCreate, SampleClass);
      can(Action.SampleAttachmentUpdate, SampleClass, ifOwner);
      can(Action.SampleAttachmentDelete, SampleClass, ifOwner);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.AccessAny, SampleClass);

      can(Action.SampleCreate, SampleClass);
      can(Action.SampleRead, SampleClass);
      can(Action.SampleUpdate, SampleClass);

      can(Action.SampleAttachmentCreate, SampleClass);
      can(Action.SampleAttachmentRead, SampleClass);
      can(Action.SampleAttachmentUpdate, SampleClass);
      can(Action.SampleAttachmentDelete, SampleClass);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.delete.includes(g))) {
      /**
       * User belonging to DELETE_GROUPS
       */
      can(Action.SampleDelete, SampleClass);
      can(Action.SampleAttachmentDelete, SampleClass);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
