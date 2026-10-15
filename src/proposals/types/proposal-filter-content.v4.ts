import {
  ContentObject,
  SchemaObject,
} from "@nestjs/swagger/dist/interfaces/open-api-spec.interface";

export function getSwaggerProposalFilterContent(
  filtersToInclude: Record<
    "limits" | "fields" | "where" | "include",
    boolean
  > = {
    where: true,
    include: true,
    fields: true,
    limits: true,
  },
): ContentObject | undefined {
  const FILTERS: Record<
    "limits" | "fields" | "where" | "include",
    SchemaObject
  > = {
    where: {
      type: "object",
      example: {
        proposalId: { $regex: "proposal", $options: "i" },
      },
    },
    include: {
      type: "array",
      items: {
        oneOf: [
          {
            type: "string",
            example: "samples",
          },
          {
            type: "object",
            properties: {
              relation: {
                type: "string",
                example: "samples",
              },
              scope: {
                type: "object",
                example: {
                  fields: ["sampleId", "title"],
                  limits: { limit: 5, skip: 0, sort: { sampleId: "asc" } },
                  where: { sampleId: { $regex: "sample", $options: "i" } },
                },
              },
            },
          },
        ],
      },
    },
    fields: {
      type: "array",
      items: {
        type: "string",
        example: "proposalId",
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
            createdAt: {
              type: "string",
              example: "asc | desc",
            },
          },
        },
      },
    },
  };

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
      const schema = filterContent["application/json"]
        .schema as SchemaObject & {
        properties?: Record<string, SchemaObject>;
      };
      schema.properties = schema.properties || {};
      schema.properties[key] = FILTERS[key];
    }
  }

  return filterContent;
}
