import { PipeTransform, Injectable } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common/exceptions";
import { flattenObject } from "src/common/utils";
import { parseSafeJson } from "src/common/safe-json";

@Injectable()
export class FilterValidationPipe implements PipeTransform<string, string> {
  constructor(
    private allowedObjectKeys: string[],
    private allowedFilterKeys: Record<string, string[]>,
    private filters: Record<string, boolean> = {
      where: true,
      include: true,
      fields: true,
      limits: true,
    },
  ) {}
  transform(inValue: string): string {
    const allAllowedKeys: string[] = [...this.allowedObjectKeys];
    const inValueParsed = parseSafeJson(inValue, {}, "filter");
    for (const key in this.filters) {
      if (this.filters[key]) {
        allAllowedKeys.push(...this.allowedFilterKeys[key]);
      }
    }
    const flattenFilterKeys = Object.keys(flattenObject(inValueParsed));
    const arbitraryObjectFields = [
      "scientificMetadata",
      "jobParameters",
      "jobParams",
      "jobResultObject",
    ];

    /*
     * intercept filter and make sure we only allow accepted values
     */
    flattenFilterKeys.forEach((key) => {
      let allowAnyPart = false;
      const keyParts = key.split(".");
      keyParts.forEach((part) => {
        const isInAllowedKeys = allAllowedKeys.includes(part);
        if (!isInAllowedKeys && !allowAnyPart) {
          throw new BadRequestException(
            `Property ${key} should not exist in the filter object`,
          );
        }
        if (arbitraryObjectFields.includes(part)) {
          allowAnyPart = true;
        }
      });
    });

    return JSON.stringify(inValueParsed);
  }
}
