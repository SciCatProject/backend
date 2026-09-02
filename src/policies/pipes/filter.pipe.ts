import { FilterPipe, WherePipe } from "src/common/pipes/filter.pipe";
import { Policy } from "../schemas/policy.schema";
import { policyV3toV4FieldMap } from "../dto/policy.obsolete.dto";

export const V3_FILTER_PIPE = [
  new FilterPipe<Policy>({ apiToDBMap: policyV3toV4FieldMap }),
];

export const V3_WHERE_PIPE = new WherePipe<Policy>({
  apiToDBMap: policyV3toV4FieldMap,
});

export const V4_FILTER_PIPE = [new FilterPipe<Policy>()];
