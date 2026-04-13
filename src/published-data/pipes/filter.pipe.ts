import { FilterPipe } from "src/common/pipes/filter.pipe";
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
    if (isEmpty(filter.where)) filter.where = value.fields;
    else filter.where = { $and: [value.fields, filter.where] };
    return { ...value, filter };
  }
}

export const V3_FILTER_PIPE = [
  new FilterPipe<PublishedData>({ apiToDBMap: publishedDataV3toV4FieldMap }),
];

export const V4_FILTER_PIPE = [
  new FilterPipe<PublishedData>({ allowObjectFields: false }),
  new AppendFieldsToFilterPipe(),
];
