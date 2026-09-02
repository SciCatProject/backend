import { FilterPipe } from "src/common/pipes/filter.pipe";
import { toApiToDBMap } from "src/common/utils/deep-mapper.util";
import {
  PublishedData,
  PublishedDataDocument,
} from "../schemas/published-data.schema";
import { publishedDataV3toV4FieldMap } from "../dto/published-data.obsolete.dto";
import { PipeTransform } from "@nestjs/common";
import { isEmpty } from "lodash";
import { IPublishedDataFilters } from "../interfaces/published-data.interface";
import { FilterQuery } from "mongoose";

class AppendFieldsToFilterPipe implements PipeTransform {
  transform(value: {
    filter: IPublishedDataFilters;
    fields: FilterQuery<PublishedDataDocument>;
  }) {
    if (isEmpty(value.fields)) return value;
    const filter = value.filter ?? {};

    if (value.fields["text"]) {
      const search = String(value.fields.text ?? "").trim();
      delete value.fields.text;
      (value.fields as FilterQuery<PublishedDataDocument>).$text = {
        $search: search,
      };
    }

    if (isEmpty(filter.where)) filter.where = value.fields;
    else filter.where = { $and: [value.fields, filter.where] };
    return { ...value, filter };
  }
}

const publishedDataV3toV4FilterMap = toApiToDBMap(publishedDataV3toV4FieldMap);

export const V3_FILTER_PIPE = [
  new FilterPipe<PublishedData>(publishedDataV3toV4FilterMap),
];

export const V4_FILTER_PIPE = [
  new FilterPipe<PublishedData>({ allowObjectFields: false }),
  new AppendFieldsToFilterPipe(),
];
