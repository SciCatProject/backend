import { IFiltersV4 } from "src/common/interfaces/common.interface";
import { ProposalLookupKeysEnumV4 } from "../types/proposal-lookup.v4";
import { SampleDocument } from "src/samples/schemas/sample.schema";
import { ISampleFields } from "src/samples/interfaces/sample-filters.interface";

export type IProposalScopesV4 = IFiltersV4<SampleDocument, ISampleFields>;

export interface IProposalRelationV4<T = IProposalScopesV4> {
  relation: ProposalLookupKeysEnumV4;
  scope: T;
}

export type IProposalFiltersV4<T, Y = null> = IFiltersV4<
  T,
  Y,
  (ProposalLookupKeysEnumV4 | IProposalRelationV4)[]
>;
