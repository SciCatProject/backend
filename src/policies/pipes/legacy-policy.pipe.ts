import { Injectable, PipeTransform } from "@nestjs/common";
import { createDeepSetter } from "src/common/utils/deep-mapper.util";
import {
  archiveV3FieldMap,
  retrieveV3FieldMap,
} from "../dto/policy.obsolete.dto";
import { Policy } from "../schemas/policy.schema";

const archiveDtoV3toV4 = createDeepSetter<
  Record<string, unknown>,
  Partial<Policy>
>(archiveV3FieldMap);
const retrieveDtoV3toV4 = createDeepSetter<
  Record<string, unknown>,
  Partial<Policy>
>(retrieveV3FieldMap);

@Injectable()
export class V3ToV4MigrationPipe<S, T> implements PipeTransform {
  constructor(private readonly mapper: (source: S) => T) {}

  transform(value: S): T {
    return this.mapper(value);
  }
}

export const LEGACY_ARCHIVE_PIPE = new V3ToV4MigrationPipe(archiveDtoV3toV4);
export const LEGACY_RETRIEVE_PIPE = new V3ToV4MigrationPipe(retrieveDtoV3toV4);
