import { FilterQuery } from "mongoose";
import { PolicyDocument } from "../schemas/policy.schema";

export interface IPolicyFilter {
  where?: FilterQuery<PolicyDocument>;
  fields?: string[];
  order?: string;
  skip?: number;
  limit?: number;
}

export interface IPolicyFilterV4 {
  where?: FilterQuery<PolicyDocument>;
  fields?: string[];
  limits?: {
    limit?: number;
    skip?: number;
    order?: string;
  };
}
