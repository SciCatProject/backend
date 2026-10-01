import { jobV3toV4FieldMap } from "../types/jobs-filter-content";
import {
  FieldsPipe,
  FilterPipe,
  OrderPipe,
  WherePipe,
} from "src/common/pipes/filter.pipe";
import { JobClass } from "../schemas/job.schema";
import { JsonToStringPipe } from "src/common/pipes/json-to-string.pipe";

export const V3_WHERE_TO_V4_PIPE = [
  new WherePipe<JobClass>({ apiToDBMap: jobV3toV4FieldMap }),
  new JsonToStringPipe(),
];
export const V3_ORDER_TO_V4_PIPE = [
  new OrderPipe<JobClass>({ apiToDBMap: jobV3toV4FieldMap }),
  new JsonToStringPipe(),
];
export const V3_FIELDS_TO_V4_PIPE = [
  new FieldsPipe<JobClass>({ apiToDBMap: jobV3toV4FieldMap }),
  new JsonToStringPipe(),
];
export const V3_FILTER_TO_V4_PIPE = [
  new FilterPipe<JobClass>({ apiToDBMap: jobV3toV4FieldMap }),
  new JsonToStringPipe(),
];
