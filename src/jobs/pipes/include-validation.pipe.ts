import { PipeTransform, Injectable } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common/exceptions";
import { isJsonString } from "src/common/utils";

@Injectable()
export class IncludeValidationPipe implements PipeTransform<
  string | string[],
  string | string[]
> {
  transform(inValue: string | string[]): string[] | string {
    if (!inValue) {
      return inValue;
    }

    const isArray = Array.isArray(inValue);
    const includeValueParsed: string[] = isArray
      ? inValue
      : isJsonString(inValue)
        ? JSON.parse(inValue ?? "{}").include
        : Array(inValue);

    if (
      includeValueParsed &&
      includeValueParsed.length != 1 &&
      (!includeValueParsed.includes("datasets") ||
        !includeValueParsed.includes("all"))
    ) {
      throw new BadRequestException(
        `The 'include' filter must contain 'datasets' — it’s currently the only collection that can be merged. To include related data, add use Jobs/v4/datasetDetails endpoint`,
      );
    }
    return inValue;
  }
}
