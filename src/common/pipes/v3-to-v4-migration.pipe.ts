import { Injectable, PipeTransform } from "@nestjs/common";
import { createDeepSetter, FieldsMap } from "../utils/deep-mapper.util";

@Injectable()
export class V3ToV4MigrationPipe<S, T> implements PipeTransform {
  private readonly mapper: (source: S) => T;

  constructor(fieldsMap: FieldsMap<S>) {
    this.mapper = createDeepSetter<S, T>(fieldsMap);
  }

  transform(value: S): T {
    return this.mapper(value);
  }
}
