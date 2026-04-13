import { HttpException, HttpStatus, Logger } from "@nestjs/common";
import { inspect } from "util";
import { DateTime } from "luxon";
import { format, unit, Unit, createUnit, MathJSON } from "mathjs";
import { Expression, FilterQuery, Model, PipelineStage } from "mongoose";
import {
  IAxiosError,
  ILimitsFilter,
  ILimitsFilterV4,
  IScientificFilter,
} from "./interfaces/common.interface";
import { ScientificRelation } from "./scientific-relation.enum";
import { DatasetType } from "src/datasets/types/dataset-type.enum";
import { isPlainObject, mapValues, omit, pickBy, some } from "lodash";

// add Å to mathjs accepted units as equivalent to angstrom
const isAlphaOriginal = Unit.isValidAlpha;
Unit.isValidAlpha = function (c) {
  return isAlphaOriginal(c) || c == "Å";
};
createUnit("Å", "1 angstrom");

export const convertToSI = (
  inputValue: number | [number, number],
  inputUnit: string,
): { valueSI: number | number[]; unitSI: string } => {
  try {
    const normalizedUnit = inputUnit.normalize("NFC"); // catch and normalize the different versions of Å in unicode
    if (inputValue instanceof Array) {
      if (inputValue.length === 2) {
        const quantity: MathJSON[] = [];
        inputValue.forEach((value) => {
          quantity.push(
            unit(value, normalizedUnit)
              .to(unit(normalizedUnit).toSI().toJSON().unit)
              .toJSON(),
          );
        });

        const valueSI = quantity.map((q) => Number(q.value));
        const unitSI = quantity[0].unit;

        return { valueSI, unitSI };
      } else {
        console.error(
          "More than two values provided in the quantity_range field",
          JSON.stringify({ inputValue }),
        );
        return { valueSI: inputValue, unitSI: inputUnit };
      }
    }
    // Workaround related to a bug reported at https://github.com/josdejong/mathjs/issues/3097 and https://github.com/josdejong/mathjs/issues/2499
    const quantity = unit(inputValue, normalizedUnit)
      .to(unit(normalizedUnit).toSI().toJSON().unit)
      .toJSON();
    return { valueSI: Number(quantity.value), unitSI: quantity.unit };
  } catch (error) {
    Logger.warn(`Error converting unit to SI: ${error}`);
    return { valueSI: inputValue, unitSI: inputUnit };
  }
};

export const appendSIUnitToPhysicalQuantity = <T extends object>(object: T) => {
  let updatedObject = {} as T;
  Object.keys(object).forEach((key) => {
    const instance = object[key as keyof T] as T[keyof T];
    let value: number | undefined;
    let unit: string | undefined;
    if (!instance) {
      updatedObject[key as keyof T] = instance;
      return;
    }
    Object.keys(instance).forEach((scientificKey) => {
      if (scientificKey.startsWith("u") && !scientificKey.endsWith("SI")) {
        unit = instance[scientificKey as keyof T[keyof T]] as unknown as string;
      }
      if (scientificKey.startsWith("v") && !scientificKey.endsWith("SI")) {
        value = instance[
          scientificKey as keyof T[keyof T]
        ] as unknown as number;
      }
    });

    if (value !== undefined && unit && unit.length > 0) {
      const { valueSI, unitSI } = convertToSI(value, unit);
      updatedObject[key as keyof T] = {
        ...instance,
        valueSI,
        unitSI,
      };
    }
    // Has nested field
    else if (isObject(instance)) {
      updatedObject = {
        ...updatedObject,
        [key]: appendSIUnitToPhysicalQuantity(instance),
      };
    } else {
      updatedObject[key as keyof T] = instance;
    }
  });
  return updatedObject;
};

export const convertToRequestedUnit = (
  value: number,
  currentUnit: string,
  requestedUnit: string,
): { valueRequested: number; unitRequested: string } => {
  const converted = unit(value, currentUnit).to(requestedUnit);
  const formatted = format(converted, { precision: 3 }).toString();
  const convertedValue = formatted.substring(0, formatted.indexOf(" "));
  const convertedUnit = formatted.substring(formatted.indexOf(" ") + 1);
  return {
    valueRequested: Number(convertedValue),
    unitRequested: convertedUnit,
  };
};

const buildCondition = (
  key: string,
  value: string | number,
  operator: string,
): Record<string, unknown> => {
  const conditions: Record<string, unknown> = { $or: [] };
  conditions["$or"] = ["", ".v", ".value"].map((suffix) => {
    return {
      [`${key}${suffix}`]: { [`${operator}`]: value },
    };
  });
  return conditions;
};

export const mapScientificQuery = (
  key: string,
  scientific: IScientificFilter[] = [],
): Record<string, unknown> => {
  const scientificFilterQuery: Record<string, unknown> = {};
  const scientificFilterQueryOr: Record<string, unknown>[] = [];

  const keyToFieldMapping: Record<string, string> = {
    scientific: "scientificMetadata",
    characteristics: "sampleCharacteristics",
  };

  const field = keyToFieldMapping[key];

  scientific.forEach((scientificFilter) => {
    const { lhs, relation, rhs, unit } = scientificFilter;
    const encodedLhs = encodeURIComponentExtended(lhs);
    const matchKeyGeneric = `${field}.${encodedLhs}`;
    const matchKeyMeasurement = `${field}.${encodedLhs}.valueSI`;
    const matchUnit = `${field}.${encodedLhs}.unitSI`;

    switch (relation) {
      case ScientificRelation.EQUAL_TO_STRING: {
        scientificFilterQueryOr.push(
          buildCondition(matchKeyGeneric, rhs, "$eq"),
        );
        break;
      }
      case ScientificRelation.EQUAL_TO_NUMERIC: {
        if (unit && unit.length > 0) {
          const { valueSI, unitSI } = convertToSI(Number(rhs), unit);
          scientificFilterQuery[matchKeyMeasurement] = { $eq: valueSI };
          scientificFilterQuery[matchUnit] = { $eq: unitSI };
        } else {
          scientificFilterQuery[`${matchKeyGeneric}.value`] = { $eq: rhs };
        }
        break;
      }
      case ScientificRelation.GREATER_THAN: {
        if (unit && unit.length > 0) {
          const { valueSI, unitSI } = convertToSI(Number(rhs), unit);
          scientificFilterQuery[matchKeyMeasurement] = { $gt: valueSI };
          scientificFilterQuery[matchUnit] = { $eq: unitSI };
        } else {
          scientificFilterQueryOr.push(
            buildCondition(matchKeyGeneric, rhs, "$gt"),
          );
        }
        break;
      }
      case ScientificRelation.LESS_THAN: {
        if (unit && unit.length > 0) {
          const { valueSI, unitSI } = convertToSI(Number(rhs), unit);
          scientificFilterQuery[matchKeyMeasurement] = { $lt: valueSI };
          scientificFilterQuery[matchUnit] = { $eq: unitSI };
        } else {
          scientificFilterQueryOr.push(
            buildCondition(matchKeyGeneric, rhs, "$lt"),
          );
        }
        break;
      }
      case ScientificRelation.CONTAINS_STRING: {
        scientificFilterQueryOr.push(
          buildCondition(matchKeyGeneric, rhs, `/${rhs}/`),
        );
        break;
      }
      case ScientificRelation.GREATER_THAN_OR_EQUAL: {
        if (unit && unit.length > 0) {
          const { valueSI, unitSI } = convertToSI(Number(rhs), unit);
          scientificFilterQuery[matchKeyMeasurement] = { $gte: valueSI };
          scientificFilterQuery[matchUnit] = { $eq: unitSI };
        } else {
          scientificFilterQueryOr.push(
            buildCondition(matchKeyGeneric, rhs, "$gte"),
          );
        }
        break;
      }
      case ScientificRelation.LESS_THAN_OR_EQUAL: {
        if (unit && unit.length > 0) {
          const { valueSI, unitSI } = convertToSI(Number(rhs), unit);
          scientificFilterQuery[matchKeyMeasurement] = { $lte: valueSI };
          scientificFilterQuery[matchUnit] = { $eq: unitSI };
        } else {
          scientificFilterQueryOr.push(
            buildCondition(matchKeyGeneric, rhs, "$lte"),
          );
        }
        break;
      }
      case ScientificRelation.RANGE: {
        if (Array.isArray(rhs) && rhs.length === 2) {
          const [min, max] = rhs;
          if (unit && unit.length > 0) {
            const { valueSI: minSI, unitSI } = convertToSI(Number(min), unit);
            const { valueSI: maxSI } = convertToSI(Number(max), unit);
            scientificFilterQuery[matchKeyMeasurement] = {
              $gt: minSI,
              $lt: maxSI,
            };
            scientificFilterQuery[matchUnit] = { $eq: unitSI };
          } else {
            scientificFilterQuery[`${matchKeyGeneric}.value`] = {
              $gt: min,
              $lt: max,
            };
          }
        } else {
          Logger.warn(
            "RANGE relation expects rhs to be [min, max] array, got: " +
              JSON.stringify(rhs),
          );
        }
        break;
      }
    }
  });
  if (scientificFilterQueryOr.length == 1) {
    scientificFilterQuery["$or"] = scientificFilterQueryOr[0]["$or"];
  } else if (scientificFilterQueryOr.length > 1) {
    scientificFilterQuery["$and"] = scientificFilterQueryOr;
  }

  return scientificFilterQuery;
};

/**Check if input is object or a physical quantity */
const isObject = (x: unknown) => {
  if (
    IsRecord(x) &&
    !(x as Record<string, unknown>).unit &&
    (x as Record<string, unknown>).unit !== "" &&
    !(x as Record<string, unknown>).u &&
    (x as Record<string, unknown>).u !== ""
  ) {
    return true;
  }
  return false;
};

export const IsRecord = (x: unknown): x is Record<string, unknown> => {
  // checks if value is (nested) object
  return x !== null && typeof x === "object" && !Array.isArray(x);
};

export const IsValueUnitObject = (
  x: unknown,
): x is { value?: unknown; unit?: unknown } => {
  // checks if the argument is object and contains either property 'value' or 'unit'
  return IsRecord(x) && ("value" in x || "unit" in x);
};

export const extractMetadataKeys = <T>(
  instances: T[],
  prop: keyof T,
): string[] => {
  const keys = new Set<string>();
  //Return nested keys in this structure parentkey.childkey.grandchildkey....
  const flattenKeys = (object: Record<string, unknown>, keyStr: string) => {
    Object.keys(object).forEach((key) => {
      const value = object[key] as Record<string, unknown>;
      const newKeyStr = `${keyStr ? keyStr + "." : ""}${key}`;
      if (isObject(value)) {
        flattenKeys(value, newKeyStr);
      } else {
        keys.add(newKeyStr);
      }
    });
  };
  instances.forEach((instance) => {
    if (instance[prop]) {
      const propObject = instance[prop] as unknown as Record<string, unknown>;
      flattenKeys(propObject, "");
    }
  });
  return Array.from(keys);
};

export const flattenObject = <T>(obj: T) => {
  const result: Record<string, unknown> = {};

  for (const i in obj) {
    if (typeof obj[i] === "object" && !Array.isArray(obj[i])) {
      const temp = flattenObject(obj[i]);
      for (const j in temp) {
        result[i + "." + j] = temp[j];
      }
    } else {
      result[i] = obj[i];
    }
  }
  return result;
};

export const handleAxiosRequestError = (
  err: unknown,
  context?: string,
): void => {
  const error: IAxiosError = err as IAxiosError;
  if (error.response) {
    // The request was made and the server responded with a status code
    // that falls out of the range of 2xx
    Logger.error(error.response.data, context);
    Logger.error(error.response.status, context);
    Logger.error(error.response.headers, context);
  } else if (error.request) {
    // The request was made but no response was received
    // `error.request` is an instance of XMLHttpRequest in the browser and an instance of
    // http.ClientRequest in node.js
    console.error(error.request);

    // Inspect is needed to deal with circular references issue.
    Logger.error({ request: inspect(error.request) }, context);
  } else {
    // Something happened in setting up the request that triggered an Error
    Logger.error("Error: " + error.message, context);
  }
  Logger.verbose(error.config, context);
};

// transform date strings in all fields with key dateKeys to updateTimesToUTC
// do nothing if input values are already UTC

export const updateTimesToUTC = <T>(dateKeys: (keyof T)[], instance: T): T => {
  dateKeys.forEach((key) => {
    if (instance[key]) {
      const dateField = instance[key] as string;
      instance[key] = DateTime.fromISO(dateField, {
        zone: DateTime.local().zoneName as string,
      }).toISO() as T[keyof T];
    }
  });

  return instance;
};

// dito but for array of instances

export const updateAllTimesToUTC = <T>(
  dateKeys: (keyof T)[],
  instances: T[],
): T[] => {
  return instances
    ? instances.map((instance) => updateTimesToUTC<T>(dateKeys, instance))
    : [];
};

export const parseOrderLimits = (
  limits: ILimitsFilter | undefined,
): ILimitsFilterV4 => {
  if (!limits) return {};
  const limitFilters: ILimitsFilterV4 = structuredClone(limits);
  if (!limits.order) return limitFilters;
  const sort: Record<string, "asc" | "desc"> = {};
  const [field, direction] = limits.order.split(":");
  if (direction === "asc" || direction === "desc") sort[field] = direction;
  limitFilters.sort = sort;
  return omit(limitFilters, "order");
};

export const parseLimitFilters = (limits: ILimitsFilter | undefined) => {
  if (!limits) {
    return { limit: 100, skip: 0, sort: {} };
  }
  const limitFilters = parseOrderLimits(limits);
  limitFilters.limit = limitFilters.limit ?? 100;
  limitFilters.skip = limitFilters.skip ?? 0;
  return limitFilters as ILimitsFilterV4 &
    Required<Pick<ILimitsFilterV4, "limit" | "skip">>;
};

export const parsePipelineSort = (sort: Record<string, "asc" | "desc">) => {
  const pipelineSort: Record<string, 1 | -1> = {};
  for (const property in sort) {
    pipelineSort[property] = sort[property] === "asc" ? 1 : -1;
  }

  return pipelineSort;
};

export const normalizeProjection = (
  fieldsProjection: Record<string, unknown>,
): Record<string, boolean> => {
  const normalized = mapValues(fieldsProjection, (v) => !!v);
  return some(normalized, (v, k) => v && k !== "_id")
    ? pickBy(normalized, (v, k) => v || k === "_id")
    : normalized;
};

export const parsePipelineProjection = (
  fieldsProjection: string[] | Record<string, unknown>,
  includeFields: string[] = [],
): Record<string, boolean> => {
  let pipelineProjection: Record<string, boolean>;
  if (isPlainObject(fieldsProjection)) {
    pipelineProjection = normalizeProjection(
      fieldsProjection as Record<string, unknown>,
    );
  } else if (Array.isArray(fieldsProjection)) {
    pipelineProjection = Object.fromEntries(
      fieldsProjection.map((f) => [f, true]),
    );
  } else {
    throw new HttpException(
      "Fields must be an array or a valid projection object",
      HttpStatus.BAD_REQUEST,
    );
  }
  includeFields.forEach((f) => (pipelineProjection[f] = true));
  return pipelineProjection;
};

export const parseLimitFiltersForPipeline = (
  limits: ILimitsFilter | undefined,
): PipelineStage[] => {
  const pipelineStages: PipelineStage[] = [];

  if (!limits) {
    pipelineStages.push({ $skip: 0 }, { $limit: 100 });
  } else {
    const { limit = 100, skip = 0, order = null } = limits;

    pipelineStages.push({ $skip: skip }, { $limit: limit });

    if (order) {
      const [field, direction] = order.split(":");
      if (direction === "asc" || direction === "desc") {
        // NOTE string val of "asc" & "desc" is not supported for aggregate pipeline
        const sortIntVal = direction === "asc" ? 1 : -1;
        pipelineStages.unshift({ $sort: { [field]: sortIntVal } });
      }
    }
  }

  return pipelineStages;
};

export const createNewFacetPipelineStage = (
  name: string,
  type: string,
  query: Record<string, unknown>,
): PipelineStage[] => {
  const pipeline: PipelineStage[] = [];

  if (type === "Array") {
    pipeline.push({
      $unwind: "$" + name,
    });
  }

  if (query && Object.keys(query).length > 0) {
    const queryCopy = { ...query };
    delete queryCopy[name];

    if (Object.keys(queryCopy).length > 0) {
      pipeline.push({
        $match: queryCopy as Record<string, Expression>,
      });
    }
  }

  const group: {
    $group: {
      _id: string | Record<string, unknown>;
      count: Record<string, number>;
    };
  } = {
    $group: {
      _id: "$" + name,
      count: {
        $sum: 1,
      },
    },
  };

  if (type === "Date") {
    group.$group._id = {
      year: {
        $year: "$" + name,
      },
      month: {
        $month: "$" + name,
      },
      day: {
        $dayOfMonth: "$" + name,
      },
    };
  }
  pipeline.push(group);

  const sort: PipelineStage.Sort = {
    $sort: {
      _id: -1,
    },
  };
  pipeline.push(sort);

  return pipeline;
};

export const schemaTypeOf = <T>(
  model: Model<T>,
  key: string,
  value: unknown = null,
): string => {
  let property = model.schema.path(key);

  if (typeof model.discriminators !== "undefined") {
    if (!property) {
      property = model.discriminators[DatasetType.Raw].schema.path(key);
    }

    if (!property) {
      property = model.discriminators[DatasetType.Derived].schema.path(key);
    }
  }

  if (!property) {
    if (value && "begin" in (value as Record<string, unknown>)) {
      return "Date";
    }
    return "String";
  }

  return property.instance;
};

export const searchExpression = <T>(
  model: Model<T>,
  fieldName: string,
  value: unknown,
): unknown => {
  if (fieldName === "text") {
    return { $search: value };
  }

  const valueType = schemaTypeOf<T>(model, fieldName, value);

  if (valueType === "String") {
    if (Array.isArray(value)) {
      if (value.length == 1) {
        return value[0];
      } else {
        return {
          $in: value,
        };
      }
    } else {
      return value;
    }
  } else if (valueType === "Date") {
    return {
      $gte: new Date((value as Record<string, string | Date>).begin),
      $lte: new Date((value as Record<string, string | Date>).end),
    };
  } else if (valueType === "Boolean") {
    return {
      $eq: value,
    };
  } else if (Array.isArray(value)) {
    return {
      $in: value,
    };
  } else if (
    valueType === "Number" &&
    value &&
    typeof value === "object" &&
    "min" in value &&
    "max" in value
  ) {
    return {
      $gte: value.min,
      $lte: value.max,
    };
  } else {
    return value;
  }
};

export const createFullqueryFilter = <T>(
  model: Model<T>,
  idField: keyof T,
  fields: FilterQuery<T> = {},
): FilterQuery<T> => {
  const accessConditions: Record<string, unknown>[] = [];
  let filterQuery: FilterQuery<T> & {
    ownerGroup?: object;
    accessGroups?: object;
    sharedWith?: object;
  } = {};

  Object.keys(fields).forEach((key) => {
    if (key === "mode") {
      const currentExpression = JSON.parse(JSON.stringify(fields[key]));
      if (idField in currentExpression) {
        currentExpression["_id"] = currentExpression[idField];
        delete currentExpression[idField];
      }
      filterQuery = { ...filterQuery, ...currentExpression };
    } else if (key === "text") {
      filterQuery.$text = searchExpression<T>(
        model,
        key,
        fields[key],
      ) as typeof filterQuery.$text;
    } else if (key === "scientific" || key === "characteristics") {
      filterQuery = {
        ...filterQuery,
        ...mapScientificQuery(key, fields[key]),
      };
    } else if (key === "userGroups") {
      // this is applied both on accessGroups and ownerGroup
      // (thus requiring the ORs list) being a generic user
      // permission filter
      accessConditions.push({
        ownerGroup: searchExpression<T>(
          model,
          "ownerGroup",
          fields[key],
        ) as object,
      });
      accessConditions.push({
        accessGroups: searchExpression<T>(
          model,
          "accessGroups",
          fields[key],
        ) as object,
      });
    } else if (key === "ownerGroup") {
      filterQuery.ownerGroup = searchExpression<T>(
        model,
        "ownerGroup",
        fields[key],
      ) as object;
    } else if (key === "accessGroups") {
      filterQuery.accessGroups = searchExpression<T>(
        model,
        "accessGroups",
        fields[key],
      ) as object;
    } else if (key === "sharedWith") {
      filterQuery.sharedWith = searchExpression<T>(
        model,
        "sharedWith",
        fields[key],
      ) as object;
    } else {
      filterQuery[key as keyof FilterQuery<T>] = searchExpression<T>(
        model,
        key,
        fields[key],
      );
    }

    if (accessConditions.length > 0) {
      if (filterQuery.$and) {
        filterQuery.$and.push({ $or: accessConditions });
      } else {
        filterQuery.$and = [{ $or: accessConditions }];
      }
    }
  });

  return filterQuery;
};

const pipelineHandler = {
  handleTextSearch: <T, Y>(
    pipeline: PipelineStage[],
    model: Model<T>,
    fields: Y,
    key: string,
  ) => {
    if (typeof fields[key as keyof Y] !== "string") return;
    const match = {
      $match: {
        $or: [
          {
            $text: searchExpression<T>(model, key, fields[key as keyof Y]) as {
              $search: string;
            },
          },
        ],
      },
    };
    return pipeline.unshift(match);
  },
  handleIdFieldSearch: <T, Y>(
    pipeline: PipelineStage[],
    model: Model<T>,
    fields: Y,
    key: string,
    idField: keyof T,
  ) => {
    const match = {
      $match: {
        [idField]: searchExpression<T>(model, key, fields[key as keyof Y]),
      },
    };
    pipeline.push(match);
  },
  handleModeSearch: <T, Y>(
    pipeline: PipelineStage[],
    fields: Y,
    key: string,
    idField: keyof T,
  ) => {
    const currentExpression = JSON.parse(
      JSON.stringify(fields[key as keyof Y]),
    );
    if (idField in currentExpression) {
      currentExpression["_id"] = currentExpression[idField];
      delete currentExpression[idField];
    }
    const match = {
      $match: currentExpression,
    };
    pipeline.push(match);
  },
  handleUserGroupSearch: <T, Y>(
    pipeline: PipelineStage[],
    model: Model<T>,
    fields: Y,
    key: string,
  ) => {
    const hasFieldAndNotGlobal =
      fields[key as keyof Y] &&
      (fields[key as keyof Y] as unknown as string[]).indexOf("globalaccess") <
        0;

    const hasOwnerGroupInSchema = "ownerGroup" in model.schema.paths;

    if (!hasFieldAndNotGlobal || !hasOwnerGroupInSchema) {
      return;
    }

    const ownerGroupMatch = searchExpression<T>(
      model,
      "ownerGroup",
      fields[key as keyof Y],
    );
    const accessGroupsMatch = searchExpression<T>(
      model,
      "accessGroups",
      fields[key as keyof Y],
    );

    const match = {
      $match: {
        $or: [
          { ownerGroup: ownerGroupMatch },
          { accessGroups: accessGroupsMatch },
        ],
      },
    };

    pipeline.push(match);
  },
  handleScientificQuery: <Y>(
    pipeline: PipelineStage[],
    fields: Y,
    key: string,
  ) => {
    const match = {
      $match: mapScientificQuery(
        key,
        fields[key as keyof Y] as unknown as IScientificFilter[],
      ),
    };
    pipeline.push(match);
  },

  handleGenericSearch: <T, Y>(
    pipeline: PipelineStage[],
    model: Model<T>,
    fields: Y,
    key: string,
  ) => {
    const match: Record<string, unknown> = {};
    match[key] = searchExpression<T>(model, key, fields[key as keyof Y]);
    const m = {
      $match: match,
    };
    pipeline.push(m);
  },
};

export const createFullfacetPipeline = <T, Y extends object>(
  model: Model<T>,
  idField: keyof T,
  fields: Y,
  facets: string[],
  subField = "",
): PipelineStage[] => {
  const pipeline: PipelineStage[] = [];
  const facetMatch: Record<string, unknown> = {};

  Object.keys(fields).forEach((key) => {
    if (facets.includes(key)) {
      facetMatch[key] = searchExpression<T>(model, key, fields[key as keyof Y]);
    }

    switch (key) {
      case "text":
        pipelineHandler.handleTextSearch(pipeline, model, fields, key);
        break;
      case idField:
        pipelineHandler.handleIdFieldSearch(
          pipeline,
          model,
          fields,
          key,
          idField,
        );
        break;
      case "mode":
        pipelineHandler.handleModeSearch(pipeline, fields, key, idField);
        break;
      case "userGroups":
        pipelineHandler.handleUserGroupSearch(pipeline, model, fields, key);
        break;
      case "scientific":
      case "sampleCharacteristics":
        pipelineHandler.handleScientificQuery(pipeline, fields, key);
        break;
      default:
        pipelineHandler.handleGenericSearch(pipeline, model, fields, key);
    }
  });

  const facetObject: Record<string, PipelineStage[]> = {};
  facets.forEach((facet) => {
    if (typeof model.schema.discriminators !== "undefined") {
      if (facet in model.schema.discriminators[DatasetType.Raw].paths) {
        facetObject[facet] = createNewFacetPipelineStage(
          facet,
          schemaTypeOf<T>(model, facet),
          facetMatch,
        );
        return;
      }
      if (facet in model.schema.discriminators[DatasetType.Derived].paths) {
        facetObject[facet] = createNewFacetPipelineStage(
          facet,
          schemaTypeOf<T>(model, facet),
          facetMatch,
        );
        return;
      }
    }
    if (facet in model.schema.paths) {
      facetObject[facet] = createNewFacetPipelineStage(
        facet,
        schemaTypeOf<T>(model, facet),
        facetMatch,
      );
      return;
    }
    if (facet.startsWith("datasetlifecycle.")) {
      const lifecycleFacet = facet.split(".")[1];
      facetObject[lifecycleFacet] = createNewFacetPipelineStage(
        lifecycleFacet,
        schemaTypeOf<T>(model, lifecycleFacet),
        facetMatch,
      );
      return;
    } else {
      Logger.warn(
        `Warning: Facet not part of any model: ${facet}`,
        "utils.createFullfacetPipeline",
      );
    }
  });

  facetObject["all"] = [
    {
      $match: facetMatch as Record<string, Expression>,
    },
  ];

  if (subField) {
    facetObject["all"].push({
      $unwind: "$" + subField,
    });
  }

  facetObject["all"].push({
    $count: "totalSets",
  });
  pipeline.push({
    $facet: facetObject as Record<string, PipelineStage.FacetPipelineStage[]>,
  });

  return pipeline;
};

export const addApiVersionField = <T extends object>(
  obj: T,
  routePath: string,
) => {
  // Extract the number from the route path. For now this is the only solution.
  const apiVersion = routePath.match(/(?<=\/v)(.*?)(?=\/)/gi)?.[0];

  Object.assign(obj, { version: apiVersion });
};

export const addCreatedByFields = <T>(
  obj: T,
  username: string,
): T & {
  createdBy: string;
  updatedBy: string;
} => {
  return {
    ...obj,
    createdBy: username,
    updatedBy: username,
  };
};

export const addUpdatedByField = <T>(
  obj: T,
  username: string,
): T & {
  updatedBy: string;
} => {
  return {
    ...obj,
    updatedBy: username,
  };
};

export const filterExampleSimplified =
  '{ "where": { "field": "value" }, "limits": {"limit": 1, "skip": 1, "order": "asc"}}';

export const filterDescriptionSimplified =
  '<pre>\n \
{\n \
  "where?": {\n \
    "field": "value"\n \
  },\n \
  "limits?": {\n \
    "limit": number,\n \
    "skip": number,\n \
    "order": [ascending, descending]\n \
  }\n \
}\n \
</pre>';

export const filterExample =
  '{ "where": { "field": "value" }, "include": [ { "relation": "target" } ], "fields": ["field1", "field2"], "limits": {"limit": 1, "skip": 1, "order": "asc"}}';

export const filterDescription =
  '<pre>\n \
{\n \
  "where?": {\n \
    "field": "value"\n \
  },\n \
  "include?": [\n \
    "target1",\n \
    {\n \
      "relation": "target2",\n \
      "scope": {\n \
        "where" : "<where_condition>"\n \
      ]\n \
    }\n \
  ],\n \
  "fields?": [ "field1", "field2", ...],\n \
  "limits?": {\n \
    "limit": number,\n \
    "skip": number,\n \
    "order": [ascending, descending]\n \
  }\n \
}\n \
</pre>';

export const fullQueryExampleLimits =
  '{"limit": 1, "skip": 0, "order": "creationTime:desc"}';

export const fullQueryDescriptionLimits =
  '<pre>\n \
{\n \
  "limit": number,\n \
  "skip": number,\n \
  "order": [ascending, descending]\n \
}\n \
</pre>';

export const datasetsFullQueryExampleFields =
  '{"mode":{},"ownerGroup":["group1"],"scientific":[{"lhs":"sample","relation":"EQUAL_TO_STRING","rhs":"my sample"},{"lhs":"temperature","relation":"GREATER_THAN","rhs":10,"unit":"celsius"}]}';

export const datasetsFullQueryDescriptionFields =
  '<pre>\n  \
{\n \
  "mode":{\n \
    "key": "value",\n \
  },\n \
  "text": string, <optional>\n \
  "creationTime": { <optional>\n \
    "begin": string,\n \
    "end": string,\n \
  },\n \
  "type": ["type1", ...], <optional>\n \
  "creationLocation": ["creationLocation1", ...], <optional>\n \
  "ownerGroup": ["group1", ...], <optional>\n \
  "keywords": ["keyword1", ...], <optional>\n \
  "isPublished: boolean,  <optional>\n \
  "scientific": [ <optional>\n \
    {\n \
      "lhs":<metadata_key>>,\n \
      "relation":["EQUAL_TO_STRING","EQUAL_TO_NUMERIC","GREATER_THAN","LESS_THAN"],\n \
      "rhs":<metadata_value>,\n \
      "unit":<unit>,\n \
    },\n \
    ...\n \
  ],\n \
  "metadataKey": "metadata", <optional>\n \
  "_id": "item id", <optional>\n \
  "userGroups": ["group1", ...], <optional>\n \
  "sharedWith": ["email", ...], <optional>\n \
}\n \
  </pre>';

export const jobsFullQueryExampleFields =
  '{"ownerGroup": "group1", "statusCode": "jobCreated"}';

export const jobsFullQueryExampleFieldsV3 =
  '{"emailJobInitiator": "group1@email.com", "jobStatusMessage": "jobCreated"}';

export const jobsFullQueryDescriptionFields =
  '<pre>\n  \
{\n \
  "createdBy": string, <optional>\n \
  "updatedBy": string, <optional>\n \
  "createdAt": { <optional>\n \
    "begin": string,\n \
    "end": string,\n \
  },\n \
  "ownerGroup": string, <optional>\n \
  "accessGroups": ["group1", ...], <optional>\n \
  "type": string, <optional>\n \
  "id": string, <optional>\n \
  "statusCode": string, <optional>\n \
  "statusMessage": string, <optional>\n \
  ... <optional>\n \
}\n \
  </pre>';

export const jobsFullQueryDescriptionFieldsV3 =
  '<pre>\n  \
{\n \
  "creationTime": { <optional>\n \
    "begin": string,\n \
    "end": string,\n \
  },\n \
  "type": string, <optional>\n \
  "id": string, <optional>\n \
  "jobStatusMessage": string, <optional>\n \
  ... <optional>\n \
}\n \
  </pre>';

export const proposalsFullQueryExampleFields =
  '{"text": "some text", "proposalId": "proposal_id"}';

export const proposalsFullQueryDescriptionFields =
  '<pre>\n \
{\n \
  "text": string, <optional>\n \
  "startTime": { <optional>\n \
    "begin": string,\n \
    "end": string,\n \
  },\n \
  "proposalId": { "regex": string, "options": string }, <optional>\n \
  "title": { "regex": string, "options": string }, <optional>\n \
  "firstname": { "regex": string, "options": string }, <optional>\n \
  "lastname": { "regex": string, "options": string }, <optional>\n \
  "endTime": { <optional>\n \
    "begin": string,\n \
    "end": string,\n \
  },\n \
  "userGroups": ["group1", ...],\n \
}\n \
  </pre>';

export const proposalFullFacetExampleFields = '["email","firstname"]';

export const samplesFullQueryExampleFields =
  '{"text": "some text", "metadataKey": "key", "characteristics": [{"lhs":"material","relation":"EQUAL_TO_STRING","rhs":"my material"}]}';

export const samplesFullQueryDescriptionFields =
  '<pre>\n \
{\n \
  "text": string, <optional>\n \
  "metadataKey": string, <optional>\n \
  "charactersitics": [ <optional>\n \
    {\n \
      "lhs":<property>>,\n \
      "relation":["EQUAL_TO_STRING","EQUAL_TO_NUMERIC","GREATER_THAN","LESS_THAN"],\n \
      "rhs":<value>,\n \
      "unit":<unit>,\n \
    },\n \
    ...\n \
  ],\n \
}\n \
  </pre>';

export const filterUserIdentityExample =
  '{ "profile.email": "this_email@your.site" }';

export const filterUserIdentityDescription =
  '<pre>\n \
  this_email@some.site\n \
or \n \
  {\n \
    "email": "this_email@some.site"\n \
  }\n \
or \n \
  {\n \
    "profile.email": "this_email@some.site"\n \
  }\n \
or \n \
  {\n \
    "where?": {\n \
      "profile.email": "this_email@some.site"\n \
    }\n \
  }\n \
This last version is deprecated and will be discontinued as soon as the FE is updated.\n \
It has been maintanined for backward compatibility.\n \
</pre>';

export const parseBoolean = (v: unknown): boolean => {
  switch (v) {
    case true:
    case "true":
    case 1:
    case "1":
    case "on":
    case "yes":
      return true;
    default:
      return false;
  }
};

export const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

export const isJsonString = (str: string) => {
  try {
    JSON.parse(str);
  } catch {
    return false;
  }
  return true;
};

/**
 * Accepts either an object or array of objects.
 *
 * Note that T should not extend Array (eg no nested arrays)
 * @param x object or array of objects
 * @returns array containing x
 */
export function oneOrMore<T>(x: T[] | T): T[] {
  return Array.isArray(x) ? x : [x];
}

/**
 * Make a single property K of T optional
 */
export type MakeOptional<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

/**
 * Type guard for Record<string, string>
 * @param obj
 * @returns
 */
export function isStringRecord(obj: unknown): obj is Record<string, string> {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }
  const rec = obj as Record<string, string>;

  return Object.keys(rec).every(
    (key) => typeof key === "string" && typeof rec[key] === "string",
  );
}

/**
 * Helper function to generate HttpExceptions
 * @param message error message
 * @param status HTTP error code. Default: 400 BAD_REQUEST
 */
export function makeHttpException(
  message: string,
  status?: number,
): HttpException {
  status = status || HttpStatus.BAD_REQUEST;
  return new HttpException(
    {
      status: status,
      message: message,
    },
    status,
  );
}

export function encodeURIComponentExtended(str: string): string {
  try {
    let encoded = encodeURIComponent(str);

    // encodeURIComponent does not encode "." automatically, so we manually replace it with "%2E" for MongoDB compatibility.
    encoded = encoded.replace(/\./g, "%2E");
    return encoded;
  } catch (error) {
    Logger.error(
      `Error encoding string: ${str}. Error: ${(error as Error).message}`,
      "encodeURIComponentExtended",
    );
    return str;
  }
}

export function decodeURIComponentExtended(str: string): string {
  try {
    let decoded = decodeURIComponent(str);
    decoded = decoded.replace(/%2E/g, ".");
    return decoded;
  } catch (error) {
    Logger.error(
      `Error decoding string: ${str}. Error: ${(error as Error).message}`,
      "decodeURIComponentExtended",
    );
    return str;
  }
}

export function encodeScientificMetadataKeys(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return metadata;
  const encoded: Record<string, unknown> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    const decodedKey = decodeURIComponentExtended(key);
    const encodedKey =
      decodedKey === key ? encodeURIComponentExtended(key) : key;

    if (value && typeof value === "object" && !Array.isArray(value)) {
      encoded[encodedKey] = encodeScientificMetadataKeys(
        value as Record<string, unknown>,
      );
    } else {
      encoded[encodedKey] = value;
    }
  });
  return encoded;
}

export function decodeScientificMetadataKeys(
  metadata: Record<string, unknown> | undefined,
): Record<string, unknown> | undefined {
  if (!metadata) return metadata;
  const decoded: Record<string, unknown> = {};

  Object.entries(metadata).forEach(([key, value]) => {
    const decodedKey = decodeURIComponentExtended(key);

    if (value && typeof value === "object" && !Array.isArray(value)) {
      decoded[decodedKey] = decodeScientificMetadataKeys(
        value as Record<string, unknown>,
      );
    } else {
      decoded[decodedKey] = value;
    }
  });
  return decoded;
}

export function decodeMetadataKeyStrings(keys: string[]): string[] {
  return keys.map((key) => decodeURIComponentExtended(key));
}
