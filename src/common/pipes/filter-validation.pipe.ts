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
    // keys of the relations the where may refer to, e.g. proposals.pi_email
    private whereRelationKeys: Record<string, string[]> = {},
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
      let allowAnyPart = false;
      const keyParts = key.split(".");
      const relation = keyParts[0] === "where" ? keyParts[1] : undefined;
      // conditions on a relation are checked against the relation's own keys
      const allowedKeys =
        relation && Object.hasOwn(this.whereRelationKeys, relation)
          ? [
              relation,
              ...this.whereRelationKeys[relation],
              ...this.allowedFilterKeys.where,
            ]
          : allAllowedKeys;
      keyParts.forEach((part) => {
        const isInAllowedKeys = allowedKeys.includes(part);
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
