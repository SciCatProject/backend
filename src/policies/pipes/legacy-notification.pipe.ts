import { Injectable, PipeTransform } from "@nestjs/common";
import { createDeepSetter } from "src/common/utils/deep-mapper.util";
import { PartialUpdatePolicyDto } from "../dto/update-policy.dto";
import { policyV3toV4FieldMap } from "../dto/policy.obsolete.dto";
import { Policy } from "../schemas/policy.schema";

const dtoV3toV4 = createDeepSetter<PartialUpdatePolicyDto, Partial<Policy>>(
  policyV3toV4FieldMap,
);

@Injectable()
export class V3ToV4MigrationPipe<S, T> implements PipeTransform {
  constructor(private readonly mapper: (source: S) => T) {}

  transform(value: S): T {
    return this.mapper(value);
  }
}

export const LEGACY_NOTIFICATION_PIPE = new V3ToV4MigrationPipe(dtoV3toV4);
