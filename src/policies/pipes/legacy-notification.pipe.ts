import { V3ToV4MigrationPipe } from "src/common/pipes/v3-to-v4-migration.pipe";
import { PartialUpdatePolicyDto } from "../dto/update-policy.dto";
import { policyV3toV4FieldMap } from "../dto/policy.obsolete.dto";
import { Policy } from "../schemas/policy.schema";

export const LEGACY_NOTIFICATION_PIPE = new V3ToV4MigrationPipe<
  PartialUpdatePolicyDto,
  Partial<Policy>
>(policyV3toV4FieldMap);
