import {
  IFilters,
  IFiltersV4,
  IScientificFilter,
} from "src/common/interfaces/common.interface";
import { DatasetLookupKeysEnum } from "../types/dataset-lookup";
import {
  IOrigDatablockFields,
  IOrigDatablockFiltersV4,
} from "src/origdatablocks/interfaces/origdatablocks.interface";
import { DatablockDocument } from "src/datablocks/schemas/datablock.schema";
import { OrigDatablockDocument } from "src/origdatablocks/schemas/origdatablock.schema";
import { IDatablockFields } from "src/datablocks/interfaces/datablocks.interface";
import { InstrumentDocument } from "src/instruments/schemas/instrument.schema";
import { ProposalDocument } from "src/proposals/schemas/proposal.schema";
import { IProposalFields } from "src/proposals/interfaces/proposal-filters.interface";
import { AttachmentDocument } from "src/attachments/schemas/attachment.schema";
import {
  IAttachmentFields,
  IAttachmentFiltersV4,
} from "src/attachments/interfaces/attachment-filters.interface";
import { SampleDocument } from "src/samples/schemas/sample.schema";
import { ISampleFields } from "src/samples/interfaces/sample-filters.interface";

export interface IDatasetFields {
  mode?: Record<string, unknown>;
  text?: string;
  creationTime?: {
    begin: string;
    end: string;
  };
  type?: string[];
  creationLocation?: string[];
  ownerGroup?: string[];
  accessGroups?: string[];
  keywords?: string[];
  isPublished?: boolean;
  scientific?: IScientificFilter[];
  metadataKey?: string;
  _id?: string;
  userGroups?: string[];
  sharedWith?: string[];
  [key: string]: unknown;
}

export type IDatasetScopesV4 =
  | IOrigDatablockFiltersV4<OrigDatablockDocument, IOrigDatablockFields>
  | IFiltersV4<DatablockDocument, IDatablockFields>
  | IFiltersV4<InstrumentDocument>
  | IFiltersV4<ProposalDocument, IProposalFields>
  | IAttachmentFiltersV4<AttachmentDocument, IAttachmentFields>
  | IFiltersV4<SampleDocument, ISampleFields>;

export type IDatasetScopesV3 =
  | IFilters<OrigDatablockDocument, IOrigDatablockFields>
  | IFilters<DatablockDocument, IDatablockFields>
  | IFilters<InstrumentDocument>
  | IFilters<ProposalDocument, IProposalFields>
  | IFilters<AttachmentDocument, IAttachmentFields>
  | IFilters<SampleDocument, ISampleFields>;

export interface IDatasetRelationV4<T = IDatasetScopesV4> {
  relation: DatasetLookupKeysEnum;
  scope: T;
}

export type IDatasetFiltersV4<T, Y = null> = IFiltersV4<
  T,
  Y,
  (DatasetLookupKeysEnum | IDatasetRelationV4)[]
>;

export type IDatasetFiltersV3<T, Y = null> = Omit<IFilters<T, Y>, "include"> & {
  include: (DatasetLookupKeysEnum | IDatasetRelationV4<IDatasetScopesV3>)[];
};

export type IDatasetFilters<T, Y = null> =
  | IDatasetFiltersV3<T, Y>
  | IDatasetFiltersV4<T, Y>;

export type IDatasetScopes = IDatasetScopesV3 | IDatasetScopesV4;

export type IDatasetRelation =
  | IDatasetRelationV4<IDatasetScopesV3>
  | IDatasetRelationV4;
