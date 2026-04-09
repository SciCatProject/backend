import { IFilters } from "src/common/interfaces/common.interface";
import { ProposalLookupKeysEnum } from "../types/proposal-lookup";
import { SampleDocument } from "src/samples/schemas/sample.schema";
import { ISampleFields } from "src/samples/interfaces/sample-filters.interface";

export type IProposalScopes = IFilters<SampleDocument, ISampleFields>;

export interface IProposalRelation<T = IProposalScopes> {
  relation: ProposalLookupKeysEnum;
  scope: T;
}

export type IProposalFilters<T, Y = null> = Omit<IFilters<T, Y>, "include"> & {
  include?: (ProposalLookupKeysEnum | IProposalRelation)[];
};
