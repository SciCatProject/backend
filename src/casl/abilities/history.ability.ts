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
import { GenericHistory } from "src/common/schemas/generic-history.schema";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { Policy } from "src/policies/schemas/policy.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";

@Injectable()
export class HistoryAbility {
  constructor(private configService: ConfigService) {
    this.accessGroups =
      this.configService.get<AccessGroupsType>("accessGroups");
  }
  private accessGroups;

  buildAbility(user: JWTUser): MongoAbility<PossibleAbilities, Conditions> {
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

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyAttachments.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_ATTACHMENT_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, Attachment);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyDatablocks.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_DATABLOCK_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, Datablock);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyDataset.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_DATASET_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, DatasetClass);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyInstrument.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_INSTRUMENT_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, Instrument);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyPolicies.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_POLICIES_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, Policy);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyProposal.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_PROPOSAL_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, ProposalClass);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historyPublishedData.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_PUBLISHED_DATA_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, PublishedData);
    }

    if (
      user.currentGroups.some((g) =>
        this.accessGroups?.historySample.includes(g),
      )
    ) {
      /**
       * User belonging to HISTORY_ACCESS_SAMPLE_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);
      can(Action.HistoryRead, SampleClass);
    }

    if (user.currentGroups.some((g) => this.accessGroups?.admin.includes(g))) {
      /**
       * User belonging to ADMIN_GROUPS
       */
      can(Action.HistoryRead, GenericHistory);

      can(Action.HistoryRead, Attachment);
      can(Action.HistoryRead, Datablock);
      can(Action.HistoryRead, DatasetClass);
      can(Action.HistoryRead, Instrument);
      can(Action.HistoryRead, Policy);
      can(Action.HistoryRead, ProposalClass);
      can(Action.HistoryRead, PublishedData);
      can(Action.HistoryRead, SampleClass);
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
