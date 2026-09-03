import { Injectable, PipeTransform } from "@nestjs/common";
import { FilterPipe, WherePipe } from "src/common/pipes/filter.pipe";
import { toApiToDBMap } from "src/common/utils/deep-mapper.util";
import { Policy } from "../schemas/policy.schema";
import { policyV3toV4FieldMap } from "../dto/policy.obsolete.dto";
import {
  IPolicyFilter,
  IPolicyFilterV4,
} from "../interfaces/policy-filters.interface";

@Injectable()
export class NestPolicyLimitsPipe implements PipeTransform<
  { filter?: IPolicyFilter },
  { filter?: IPolicyFilterV4 }
> {
  transform(value: { filter?: IPolicyFilter }): { filter?: IPolicyFilterV4 } {
    if (!value?.filter) return value as { filter?: IPolicyFilterV4 };

    const { where, fields, order, skip, limit } = value.filter;
    return { filter: { where, fields, limits: { order, skip, limit } } };
  }
}

const policyV3toV4FilterMap = toApiToDBMap(policyV3toV4FieldMap);

export const V3_FILTER_PIPE = [
  new FilterPipe<Policy>(policyV3toV4FilterMap),
  new NestPolicyLimitsPipe(),
];

export const V3_WHERE_PIPE = new WherePipe<Policy>(policyV3toV4FilterMap);
