import { PipeTransform, Injectable } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common/exceptions";
import { isJsonString } from "src/common/utils";
import {
  DATASET_LOOKUP_FIELDS,
  DatasetLookupKeysEnum,
} from "../types/dataset-lookup";

const REQUIRED_VALUES: unknown[] = [true, false, "all"];

@Injectable()
export class IncludeRequiredValidationPipe implements PipeTransform<
  string,
  string
> {
  transform(inValue: string): string {
    if (!inValue || !isJsonString(inValue)) return inValue;
    const include = JSON.parse(inValue).include;
    if (!Array.isArray(include)) return inValue;

    for (const entry of include) {
      if (typeof entry !== "object" || !("required" in entry)) continue;
      const { relation, required } = entry;
      if (!REQUIRED_VALUES.includes(required))
        throw new BadRequestException(
          `Invalid required value ${JSON.stringify(required)} for relation ${relation}, expected true, false or "all"`,
        );
      const lookup = DATASET_LOOKUP_FIELDS[relation as DatasetLookupKeysEnum];
      if (required && !lookup)
        throw new BadRequestException(
          `required is not supported for relation ${relation}`,
        );
      // "all" compares with the ids stored on the dataset, which only
      // relations referenced by an array of ids pass in the lookup let
      if (
        required === "all" &&
        typeof Object.values(lookup?.$lookup.let ?? {})[0] !== "object"
      )
        throw new BadRequestException(
          `required "all" is not supported for relation ${relation}`,
        );
    }

    return inValue;
  }
}
