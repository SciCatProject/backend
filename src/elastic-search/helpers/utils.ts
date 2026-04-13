import {
  AggregationsAggregate,
  AggregationsFrequentItemSetsBucketKeys,
} from "@elastic/elasticsearch/lib/api/types";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import {
  IFilter,
  ITransformedFullFacets,
  nestedQueryObject,
  ScientificQuery,
} from "../interfaces/es-common.type";
import { isObject } from "lodash";

export const transformKey = (key: string): string => {
  return key.trim().replace(/[.]/g, "\\.").replace(/ /g, "_").toLowerCase();
};
export const addValueType = (obj: Record<string, unknown>) => {
  const newObj: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(obj)) {
    const newKey = transformKey(key);

    const isNumberValueType =
      typeof (value as Record<string, unknown>)?.value === "number";
    const isStringValueType =
      typeof (value as Record<string, unknown>)?.value === "string";

    if (isObject(value)) {
      if (isNumberValueType) {
        (value as Record<string, unknown>)["value_type"] = "number";
      } else if (isStringValueType) {
        (value as Record<string, unknown>)["value_type"] = "string";
      } else {
        (value as Record<string, unknown>)["value_type"] = "unknown";
      }
    }

    newObj[newKey] = value;
  }

  return newObj;
};

export const transformMiddleKey = (key: string) => {
  const parts = key.trim().split(".");
  const firstPart = parts[0];
  const lastPart = parts[parts.length - 1];

  const middlePartRaw = parts.slice(1, parts.length - 1).join(".");
  const middlePart = transformKey(middlePartRaw);

  let transformedKey = firstPart;
  if (middlePart) {
    transformedKey += `.${middlePart}`;
  }
  transformedKey += `.${lastPart}`;

  return { transformedKey, firstPart, middlePart, lastPart };
};

export const initialSyncTransform = (obj: DatasetClass) => {
  const modifedDocInArray = !!obj.scientificMetadata
    ? Object.entries(obj.scientificMetadata as Record<string, unknown>).map(
        ([key, value]) => {
          const transformedKey = transformKey(key);

          if (!isObject(value)) {
            return [transformedKey, { value: value, unit: "" }];
          }

          if ("value" in value) {
            if (typeof value.value === "number") {
              return [transformedKey, { ...value, value_type: "number" }];
            }
            if (typeof value.value === "string") {
              return [transformedKey, { ...value, value_type: "string" }];
            }
          }

          return [transformedKey, { ...value, value_type: "unknown" }];
        },
      )
    : [];

  const modifiedDocInObject = {
    ...obj,
    scientificMetadata:
      modifedDocInArray.length > 0 ? Object.fromEntries(modifedDocInArray) : {},
  };

  return modifiedDocInObject;
};

const extractNestedQueryOperationValue = (query: nestedQueryObject) => {
  const field = Object.keys(query)[0];
  const operationWithPrefix = Object.keys(query[field])[0];

  const value =
    typeof query[field][operationWithPrefix] === "string"
      ? (query[field][operationWithPrefix] as string).trim()
      : query[field][operationWithPrefix];

  const operation = operationWithPrefix.replace("$", "");

  return { operation, value, field };
};

export const convertToElasticSearchQuery = (
  scientificQuery: ScientificQuery,
): IFilter[] => {
  const filters: IFilter[] = [];

  for (const field in scientificQuery) {
    const query = scientificQuery[field];

    if (field === "$and" && Array.isArray(query)) {
      query.forEach((query: { $or: nestedQueryObject[] }) => {
        const shouldQueries = query.$or.map((orQuery: nestedQueryObject) => {
          const { operation, value, field } =
            extractNestedQueryOperationValue(orQuery);
          const filterType = operation === "eq" ? "term" : "range";

          // NOTE: if value is not a number, we use keyword field for exact match
          const targetField =
            typeof value !== "number" ? `${field}.keyword` : field;
          return {
            [filterType]: {
              [targetField]:
                operation === "eq" ? value : { [operation]: value },
            },
          };
        });
        filters.push({
          bool: {
            should: shouldQueries,
            minimum_should_match: 1,
          },
        });
      });
    } else if (field === "$or" && Array.isArray(query)) {
      const shouldQueries = query.map((query: nestedQueryObject) => {
        const { operation, value, field } =
          extractNestedQueryOperationValue(query);
        const filterType = operation === "eq" ? "term" : "range";

        // NOTE: if value is not a number, we use keyword field for exact match
        const targetField =
          typeof value !== "number" ? `${field}.keyword` : field;
        return {
          [filterType]: {
            [targetField]: operation === "eq" ? value : { [operation]: value },
          },
        };
      });
      filters.push({
        bool: {
          should: shouldQueries,
          minimum_should_match: 1,
        },
      });
    } else if (
      Object.keys(query).length > 1 &&
      !Array.isArray(query) &&
      isObject(query)
    ) {
      const { transformedKey, firstPart, middlePart, lastPart } =
        transformMiddleKey(field);

      const rangeOps: Record<string, number> = {};

      Object.keys(query).forEach((op) => {
        const val = query[op];
        rangeOps[op.replace("$", "")] =
          typeof val === "number" ? val : Number(val);
      });

      if (lastPart === "valueSI" || lastPart === "value") {
        filters.push({
          term: {
            [`${firstPart}.${middlePart}.value_type`]: "number",
          },
        });
      }
      filters.push({
        range: { [transformedKey]: rangeOps },
      });
    } else {
      const operation = Object.keys(query)[0];
      const value =
        typeof (query as Record<string, "eq">)[operation] === "string"
          ? (query as Record<string, "eq">)[operation].trim()
          : (query as Record<string, "eq">)[operation];
      const esOperation = operation.replace("$", "");

      // NOTE:
      // trasnformedKey = "scientificMetadata.someKey.value"
      // firstPart = "scientificMetadata",
      // middlePart = "someKey"
      // lastPart = "value"
      const { transformedKey, firstPart, middlePart, lastPart } =
        transformMiddleKey(field);

      if (lastPart === "valueSI" || lastPart === "value") {
        const numberFilter = {
          term: {
            [`${firstPart}.${middlePart}.value_type`]:
              typeof value === "number" ? "number" : "string",
          },
        };
        filters.push(numberFilter);
      }

      // NOTE: if value is not a number, we use keyword field for exact match for term queries
      // for range queries we can skip this as string values will not be accepted
      const targetField =
        typeof value !== "number" ? `${field}.keyword` : field;

      const filter =
        esOperation === "eq"
          ? {
              term: { [`${targetField}`]: value },
            }
          : {
              range: { [`${transformedKey}`]: { [esOperation]: value } },
            };

      filters.push(filter);
    }
  }
  return filters;
};

export const transformFacets = (
  aggregation: AggregationsAggregate,
): Record<string, unknown>[] => {
  const transformed = Object.entries(aggregation).reduce(
    (acc, [key, value]) => {
      const isBucketArray = Array.isArray(value.buckets);

      acc[key] = isBucketArray
        ? value.buckets.map(
            (bucket: AggregationsFrequentItemSetsBucketKeys) => ({
              _id: bucket.key,
              count: bucket.doc_count,
            }),
          )
        : [{ totalSets: value.value }];

      return acc;
    },
    {} as ITransformedFullFacets,
  );

  return [transformed];
};
