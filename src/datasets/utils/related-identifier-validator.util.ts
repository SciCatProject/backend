import { Injectable } from "@nestjs/common";
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  isURL,
} from "class-validator";

@Injectable()
@ValidatorConstraint({ name: "relatedIdentifierMatchesType", async: false })
export class RelatedIdentifierMatchesType implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    if (typeof value !== "string") {
      return false;
    }

    const dto = args.object as { relatedIdentifierType?: string };

    switch (dto.relatedIdentifierType) {
      case "URL":
        return isURL(value);
      default:
        return true;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as { relatedIdentifierType?: string };
    const type = dto.relatedIdentifierType ?? "the configured type";
    return `relatedIdentifier must be a valid ${type} when relatedIdentifierType is set to '${dto.relatedIdentifierType}'.`;
  }
}
