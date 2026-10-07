import { PipeTransform, Injectable } from "@nestjs/common";
import { BadRequestException } from "@nestjs/common/exceptions";
import { PipelineStage } from "mongoose";
import { isJsonString } from "src/common/utils";
import { DatasetLookupKeysEnum } from "src/datasets/types/dataset-lookup";
import { OrigDatablockLookupKeysEnum } from "src/origdatablocks/types/origdatablock-lookup";
import { ProposalLookupKeysEnum } from "src/proposals/types/proposal-lookup";

@Injectable()
export class IncludeValidationPipe implements PipeTransform<
  string | string[],
  string | string[] | { relation: string }[]
> {
  constructor(
    private lookupFields:
      | Record<DatasetLookupKeysEnum, PipelineStage.Lookup | undefined>
      | Record<OrigDatablockLookupKeysEnum, PipelineStage.Lookup | undefined>
      | Record<ProposalLookupKeysEnum, PipelineStage.Lookup | undefined>,
  ) {}
  transform(
    inValue: string | string[] | { relation: string }[],
  ): string[] | string | { relation: string }[] {
    if (!inValue) {
      return inValue;
    }

    const isArray = Array.isArray(inValue);
    const includeValueParsed: string[] = isArray
      ? inValue
      : isJsonString(inValue)
        ? JSON.parse(inValue ?? "{}").include
        : Array(inValue);

    includeValueParsed?.map((field) => {
      let relationField = field;
      if (typeof field === "object" && "relation" in field)
        relationField = (field as { relation: string }).relation;
      if (Object.keys(this.lookupFields).includes(relationField)) {
        return field;
      } else {
        throw new BadRequestException(
          `Provided include field ${JSON.stringify(relationField)} is not part of the dataset relations`,
        );
      }
    });

    return inValue;
  }
}
