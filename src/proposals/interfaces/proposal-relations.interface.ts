import { IFilters, IFiltersV4 } from "src/common/interfaces/common.interface";
import { ProposalLookupKeysEnum } from "../types/proposal-lookup";
import { SampleDocument } from "src/samples/schemas/sample.schema";
import { ISampleFields } from "src/samples/interfaces/sample-filters.interface";

export type IProposalScopesV4 = IFiltersV4<SampleDocument, ISampleFields>;

export type IProposalScopesV3 = IFilters<SampleDocument, ISampleFields>;

export interface IProposalRelationV4<T = IProposalScopesV4> {
  relation: ProposalLookupKeysEnum;
  scope: T;
}

export type IProposalFiltersV4<T, Y = null> = IFiltersV4<
  T,
  Y,
  (ProposalLookupKeysEnum | IProposalRelationV4)[]
>;

export type IProposalFiltersV3<T, Y = null> = Omit<
  IFilters<T, Y>,
  "include"
> & {
  include?: (ProposalLookupKeysEnum | IProposalRelationV4<IProposalScopesV3>)[];
};

export type IProposalFilters<T, Y = null> =
  | IProposalFiltersV3<T, Y>
  | IProposalFiltersV4<T, Y>;

export type IProposalScopes = IProposalScopesV3 | IProposalScopesV4;

export type IProposalRelation =
  | IProposalRelationV4<IProposalScopesV3>
  | IProposalRelationV4;
