import { Injectable } from "@nestjs/common";
import {
  ValidatorConstraint,
  ValidatorConstraintInterface,
  ValidationArguments,
  isURL,
} from "class-validator";
import { CreateRelationshipDto } from "../dto/create-relationship.dto";

@Injectable()
@ValidatorConstraint({
  name: "relatedIdentifierMatchesType",
  async: false,
})
export class RelatedIdentifierMatchesType implements ValidatorConstraintInterface {
  validate(value: unknown, args: ValidationArguments) {
    if (typeof value !== "string") {
      return false;
    }

    const dto = args.object as Partial<CreateRelationshipDto>;

    switch (dto.identifierType) {
      case "URL":
        return isURL(value);
      default:
        return true;
    }
  }

  defaultMessage(args: ValidationArguments) {
    const dto = args.object as Partial<CreateRelationshipDto>;
    const type = dto.identifierType ?? "the configured type";
    return `identifier must be a valid ${type} when identifierType is set to '${dto.identifierType}'.`;
  }
}
