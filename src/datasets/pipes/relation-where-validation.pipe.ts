import { PipeTransform, Injectable } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common/exceptions";
import { isJsonString } from "src/common/utils";
import {
  DATASET_RELATIONS,
  DatasetLookupKeysEnum,
} from "../types/dataset-lookup";
import { findRelationsInWhere } from "../utils/relation-where.util";

@Injectable()
export class RelationWhereValidationPipe implements PipeTransform<
  string,
  string
> {
  transform(inValue: string): string {
    if (!inValue || !isJsonString(inValue)) return inValue;
    const { where, include } = JSON.parse(inValue);

    const included = (Array.isArray(include) ? include : []).map((entry) =>
      typeof entry === "object" ? entry?.relation : entry,
    );
    const missing = findRelationsInWhere(where, DATASET_RELATIONS).filter(
      (relation) =>
        !included.includes(relation) &&
        !included.includes(DatasetLookupKeysEnum.all),
    );
    if (missing.length > 0)
      throw new BadRequestException(
        `The where filter refers to ${missing.join(", ")}, which must also be included`,
      );

    return inValue;
  }
}
