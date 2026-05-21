import { Inject, Injectable, Scope } from "@nestjs/common";
import { REQUEST } from "@nestjs/core";
import { Request } from "express";
import { PipelineStage } from "mongoose";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "src/casl/action.enum";
import { DatasetLookupKeysEnum } from "./types/dataset-lookup";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";
import { DatasetClass } from "./schemas/dataset.schema";

@Injectable({ scope: Scope.REQUEST })
export class DatasetsAccessService {
  constructor(
    private caslAbilityFactory: CaslAbilityFactory,
    @Inject(REQUEST) private request: Request,
  ) {}

  getRelationViewAccess(field: DatasetLookupKeysEnum, user: JWTUser) {
    switch (field) {
      case DatasetLookupKeysEnum.proposals: {
        const ability = this.caslAbilityFactory.proposalAccess(user);
        const canViewAny = ability.can(Action.AccessAny, ProposalClass);
        const canView = ability.can(Action.ProposalRead, ProposalClass);
        return { canViewAny, canView };
      }
      case DatasetLookupKeysEnum.origdatablocks: {
        const ability = this.caslAbilityFactory.origDatablockAccess(user);
        const canViewAny = ability.can(Action.AccessAny, OrigDatablock);
        const canView = ability.can(Action.OrigdatablockRead, OrigDatablock);
        return { canViewAny, canView };
      }
      case DatasetLookupKeysEnum.datablocks: {
        const ability = this.caslAbilityFactory.datasetAccess(user);
        const canViewAny = ability.can(Action.AccessAny, DatasetClass);
        const canView = ability.can(Action.DatasetDatablockRead, DatasetClass);
        return { canViewAny, canView };
      }
      case DatasetLookupKeysEnum.samples: {
        const ability = this.caslAbilityFactory.sampleAccess(user);
        const canViewAny = ability.can(Action.AccessAny, SampleClass);
        const canView = ability.can(Action.SampleRead, SampleClass);
        return { canViewAny, canView };
      }
      case DatasetLookupKeysEnum.instruments: {
        const ability = this.caslAbilityFactory.instrumentAccess(user);
        const canViewAny = ability.can(Action.InstrumentRead, Instrument);
        return {
          canViewAny,
          canView: false,
        };
      }
      case DatasetLookupKeysEnum.attachments: {
        const ability = this.caslAbilityFactory.datasetAccess(user);
        const canViewAny = ability.can(Action.AccessAny, DatasetClass);
        const canView = ability.can(Action.DatasetAttachmentRead, DatasetClass);
        return { canViewAny, canView };
      }
      default:
        return {
          canViewAny: false,
          canView: false,
        };
    }
  }

  addRelationFieldAccess(fieldValue: PipelineStage.Lookup) {
    const currentUser = this.request.user as JWTUser;

    const access = this.getRelationViewAccess(
      fieldValue.$lookup.as as DatasetLookupKeysEnum,
      currentUser,
    );
    if (access) {
      const { canViewAny, canView } = access;
      if (!canViewAny) {
        let pipeline: PipelineStage.Lookup["$lookup"]["pipeline"];
        if (currentUser && canView) {
          pipeline = [
            {
              $match: {
                $or: [
                  { ownerGroup: { $in: currentUser.currentGroups } },
                  { accessGroups: { $in: currentUser.currentGroups } },
                  { sharedWith: { $in: [currentUser.email] } },
                  { isPublished: true },
                ],
              },
            },
          ];
        } else {
          pipeline = [
            {
              $match: {
                isPublished: true,
              },
            },
          ];
        }
        fieldValue.$lookup.pipeline = fieldValue.$lookup.pipeline ?? [];
        fieldValue.$lookup.pipeline.push(...pipeline);
      }
    }
  }

  addDatasetAccess(fieldValue: PipelineStage.Lookup) {
    const currentUser = this.request.user as JWTUser;
    const ability = this.caslAbilityFactory.datasetAccess(currentUser);
    const canViewAny = ability.can(Action.AccessAny, DatasetClass);
    const canView = ability.can(Action.DatasetRead, DatasetClass);

    if (!canViewAny) {
      if (canView) {
        fieldValue.$lookup.pipeline?.unshift({
          $match: {
            $or: [
              { ownerGroup: { $in: currentUser.currentGroups } },
              { accessGroups: { $in: currentUser.currentGroups } },
              { sharedWith: { $in: [currentUser.email] } },
              { isPublished: true },
            ],
          },
        });
      } else {
        fieldValue.$lookup.pipeline?.unshift({
          $match: {
            isPublished: true,
          },
        });
      }
    }
  }
}
