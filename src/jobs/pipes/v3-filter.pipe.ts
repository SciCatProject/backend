import { jobV3toV4FieldMap } from "../types/jobs-filter-content";
import {
  FieldsPipe,
  FilterPipe,
  OrderPipe,
  WherePipe,
} from "src/common/pipes/filter.pipe";
import { JobClass } from "../schemas/job.schema";
import { JsonToStringPipe } from "src/common/pipes/json-to-string.pipe";
import { toApiToDBMap } from "src/common/utils/deep-mapper.util";

const jobV3toV4FilterMap = toApiToDBMap(jobV3toV4FieldMap);

export const V3_WHERE_TO_V4_PIPE = [
  new WherePipe<JobClass>(jobV3toV4FilterMap),
  new JsonToStringPipe(),
];
export const V3_ORDER_TO_V4_PIPE = [
  new OrderPipe<JobClass>(jobV3toV4FilterMap),
  new JsonToStringPipe(),
];
export const V3_FIELDS_TO_V4_PIPE = [
  new FieldsPipe<JobClass>(jobV3toV4FilterMap),
  new JsonToStringPipe(),
];
export const V3_FILTER_TO_V4_PIPE = [
  new FilterPipe<JobClass>(jobV3toV4FilterMap),
  new JsonToStringPipe(),
];
