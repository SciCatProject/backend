import {
  ContentObject,
  SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";
import { parseBoolean } from "src/common/utils";

const FILTERS: Record<"limits" | "fields" | "where" | "include", object> = {
  where: {
    type: "object",
    example: {
      datasetId: { $regex: "Dataset", $options: "i" },
    },
  },
  include: {
    type: "array",
    items: {
      type: "string",
      example: "all",
    },
  },
  fields: {
    type: "array",
    items: {
      type: "string",
      example: "datasetId",
    },
  },
  limits: {
    type: "object",
    properties: {
      limit: {
        type: "number",
        example: 10,
      },
      skip: {
        type: "number",
        example: 0,
      },
      sort: {
        type: "object",
        properties: {
          datasetId: {
            type: "string",
            example: "asc | desc",
          },
        },
      },
    },
  },
};

/**
 * NOTE: This is disabled only for the official sdk package generation as the schema validation complains about the content field.
 * But we want to have it when we run the application as it improves swagger documentation and usage a lot.
 * We use "content" property as it is described in the swagger specification: https://swagger.io/docs/specification/v3_0/describing-parameters/#schema-vs-content:~:text=explode%3A%20false-,content,-is%20used%20in
 */
export const getSwaggerOrigDatablockFilterContent = (
  filtersToInclude: Record<keyof typeof FILTERS, boolean> = {
    where: true,
    include: true,
    fields: true,
    limits: true,
  },
): ContentObject | undefined => {
  if (parseBoolean(process.env.SDK_PACKAGE_SWAGGER_HELPERS_DISABLED ?? false)) {
    return undefined;
  }

  const filterContent: Record<string, { schema: SchemaObject }> = {
    "application/json": {
      schema: {
        type: "object",
        properties: {},
      },
    },
  };

  for (const filtersKey in filtersToInclude) {
    const key = filtersKey as keyof typeof FILTERS;

    if (filtersToInclude[key] && FILTERS[key]) {
      filterContent["application/json"].schema.properties![key] = FILTERS[key];
    }
  }

  return filterContent;
};
