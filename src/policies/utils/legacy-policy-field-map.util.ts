import { createDeepSetter } from "src/common/utils/deep-mapper.util";
import {
  archiveV3FieldMap,
  retrieveV3FieldMap,
} from "../dto/policy.obsolete.dto";
import { Policy } from "../schemas/policy.schema";

// Translates a flat v3 request body into the archive/retrieve document
// fields it maps to (see archiveV3FieldMap/retrieveV3FieldMap).
export const toArchivePolicyFields = createDeepSetter<
  Record<string, unknown>,
  Partial<Policy>
>(archiveV3FieldMap);

export const toRetrievePolicyFields = createDeepSetter<
  Record<string, unknown>,
  Partial<Policy>
>(retrieveV3FieldMap);
