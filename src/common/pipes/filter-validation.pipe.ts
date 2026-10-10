import { PipeTransform, Injectable } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common/exceptions";
import { flattenObject } from "src/common/utils";

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
    // relations whose fields the where may refer to, e.g. proposals.pi_email
    private whereRelations: string[] = [],
  ) {}
  transform(inValue: string): string {
    const allAllowedKeys: string[] = [...this.allowedObjectKeys];
    let inValueParsed;
    for (const key in this.filters) {
      if (this.filters[key]) {
        allAllowedKeys.push(...this.allowedFilterKeys[key]);
      }
    }
    try {
      inValueParsed = JSON.parse(inValue ?? "{}");
    } catch (err) {
      const error = err as Error;
      throw new BadRequestException(`Invalid JSON in filter: ${error.message}`);
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
      const keyParts = key.split(".");
      // fields of related documents are not part of the allowed keys
      let allowAnyPart =
        keyParts[0] === "where" && this.whereRelations.includes(keyParts[1]);
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
