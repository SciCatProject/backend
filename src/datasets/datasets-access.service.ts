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
        const ability = this.caslAbilityFactory.proposalsInstanceAccess(user);
        const canViewAny = ability.can(Action.ProposalsReadAny, ProposalClass);
        const canViewAccess = ability.can(
          Action.ProposalsReadManyAccess,
          ProposalClass,
        );
        const canViewOwner = ability.can(
          Action.ProposalsReadManyOwner,
          ProposalClass,
        );
        const canViewPublic = ability.can(
          Action.ProposalsReadManyPublic,
          ProposalClass,
        );

        return { canViewAny, canViewOwner, canViewAccess, canViewPublic };
      }
      case DatasetLookupKeysEnum.origdatablocks: {
        const ability =
          this.caslAbilityFactory.origDatablockInstanceAccess(user);
        const canViewAny = ability.can(
          Action.OrigdatablockReadAny,
          OrigDatablock,
        );
        const canViewAccess = ability.can(
          Action.OrigdatablockReadManyAccess,
          OrigDatablock,
        );
        const canViewOwner = ability.can(
          Action.OrigdatablockReadManyOwner,
          OrigDatablock,
        );
        const canViewPublic = ability.can(
          Action.OrigdatablockReadManyPublic,
          OrigDatablock,
        );

        return { canViewAny, canViewOwner, canViewAccess, canViewPublic };
      }
      case DatasetLookupKeysEnum.datablocks: {
        const ability = this.caslAbilityFactory.datasetInstanceAccess(user);
        const canViewAny = ability.can(
          Action.DatasetDatablockReadAny,
          DatasetClass,
        );
        const canViewAccess = ability.can(
          Action.DatasetDatablockReadAccess,
          DatasetClass,
        );
        const canViewOwner = ability.can(
          Action.DatasetDatablockReadOwner,
          DatasetClass,
        );
        const canViewPublic = ability.can(
          Action.DatasetDatablockReadPublic,
          DatasetClass,
        );

        return { canViewAny, canViewOwner, canViewAccess, canViewPublic };
      }
      case DatasetLookupKeysEnum.samples: {
        const ability = this.caslAbilityFactory.samplesInstanceAccess(user);
        const canViewAny = ability.can(Action.SampleReadAny, SampleClass);
        const canViewAccess = ability.can(
          Action.SampleReadManyAccess,
          SampleClass,
        );
        const canViewOwner = ability.can(
          Action.SampleReadManyOwner,
          SampleClass,
        );
        const canViewPublic = ability.can(
          Action.SampleReadManyPublic,
          SampleClass,
        );

        return { canViewAny, canViewOwner, canViewAccess, canViewPublic };
      }
      case DatasetLookupKeysEnum.instruments: {
        // TODO: Fix this if the instrument access change
        const ability = this.caslAbilityFactory.instrumentEndpointAccess(user);
        const canViewAny = ability.can(Action.InstrumentRead, Instrument);

        return {
          canViewAny,
          canViewOwner: false,
          canViewAccess: false,
          canViewPublic: true,
        };
      }
      case DatasetLookupKeysEnum.attachments: {
        const ability = this.caslAbilityFactory.datasetEndpointAccess(user);
        const canViewAny = ability.can(
          Action.DatasetAttachmentRead,
          DatasetClass,
        );
        const canViewAccess = ability.can(
          Action.DatasetAttachmentRead,
          DatasetClass,
        );
        const canViewOwner = ability.can(
          Action.DatasetAttachmentRead,
          DatasetClass,
        );

        return { canViewAny, canViewOwner, canViewAccess, canViewPublic: true };
      }
      default:
        return {
          canViewAny: false,
          canViewOwner: false,
          canViewAccess: false,
          canViewPublic: true,
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
      const { canViewAny, canViewAccess, canViewOwner } = access;
      if (!canViewAny) {
        let pipeline: PipelineStage.Lookup["$lookup"]["pipeline"];
        if (canViewAccess) {
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
        } else if (canViewOwner) {
          pipeline = [
            {
              $match: {
                ownerGroup: { $in: currentUser.currentGroups },
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
    const ability = this.caslAbilityFactory.datasetInstanceAccess(currentUser);
    const canViewAny = ability.can(Action.DatasetReadAny, DatasetClass);
    const canViewAccess = ability.can(
      Action.DatasetReadManyAccess,
      DatasetClass,
    );
    const canViewOwner = ability.can(Action.DatasetReadManyOwner, DatasetClass);

    if (!canViewAny) {
      if (canViewAccess) {
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
      } else if (canViewOwner) {
        fieldValue.$lookup.pipeline?.unshift({
          $match: {
            ownerGroup: { $in: currentUser.currentGroups },
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
