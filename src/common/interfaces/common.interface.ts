import { FilterQuery } from "mongoose";
import { ScientificRelation } from "../scientific-relation.enum";

export interface IScientificFilter {
  lhs: string;
  relation: ScientificRelation;
  rhs: string | number;
  unit: string | undefined;
}

export interface IAxiosError {
  response?: {
    data: Record<string, unknown>;
    status: number;
    headers: Record<string, unknown>;
  };
  request?: Record<string, unknown>;
  message: unknown;
  config: Record<string, unknown>;
}

export interface IProposalMember {
  firstName: string;
  lastName: string;
  email: string;
}

export interface IProposalAcceptedMessage {
  proposalId: number;
  shortCode: string;
  title: string;
  abstract: string;
  members: IProposalMember[];
  proposer: IProposalMember;
}

export interface ILimitsFilter {
  limit?: number;
  skip?: number;
  order?: string;
}

export interface IFilters<T, Y = null, Z = string> {
  where?: FilterQuery<T>;
  include?: { relation: Z }[];
  fields?: Y;
  limits?: ILimitsFilter;
}

export interface IFacets<T> {
  fields?: T;
  facets?: string[];
}

export interface IDatafileFilter {
  path?: string;
  size?: {
    min?: number;
    max?: number;
  };
  time?: {
    min?: string;
    max?: string;
  };
  chk?: string;
  uid?: string;
  gid?: string;
  perm?: string;
  type?: string;
  metadata?: Record<string, unknown>;
}

export type IFiltersV4<T, Y = null, Z = string> = Pick<
  IFilters<T, Y>,
  "where" | "fields"
> & {
  include?: Z;
  limits?: ILimitsFilterV4<T>;
};

export interface ILimitsFilterV4<T = null> {
  limit?: number;
  skip?: number;
  sort?: Record<keyof T, "asc" | "desc">;
}
