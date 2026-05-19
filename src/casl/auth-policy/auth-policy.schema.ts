import Ajv from "ajv";
import { AuthPolicy } from "./auth-policy.interface";

// -----------------------------------------------------------------------
// Reusable sub-schema fragments (inlined – Ajv v8 / JSON Schema Draft-07)
// -----------------------------------------------------------------------

const ruleEntrySchema = {
  type: "object",
  required: ["action", "subject"],
  additionalProperties: true,
  properties: {
    action: { type: "string", minLength: 1 },
    subject: { type: "string", minLength: 1 },
    conditions: { type: "object" },
  },
} as const;

const groupRulesSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    can: { type: "array", items: ruleEntrySchema },
    cannot: { type: "array", items: ruleEntrySchema },
  },
} as const;

// -----------------------------------------------------------------------
// Root schema
// -----------------------------------------------------------------------

export const AuthPolicySchema = {
  type: "object",
  required: ["version", "endpoints", "instance"],
  additionalProperties: false,
  properties: {
    version: { type: "number" },
    endpoints: {
      type: "object",
      additionalProperties: false,
      properties: {
        defaults: {
          type: "array",
          items: ruleEntrySchema,
        },
        groups: {
          type: "object",
          additionalProperties: groupRulesSchema,
        },
      },
    },
    instance: {
      type: "object",
      additionalProperties: false,
      properties: {
        defaults: groupRulesSchema,
        groups: {
          type: "object",
          additionalProperties: groupRulesSchema,
        },
      },
    },
  },
};

// Pre-compiled validator – exported so it can be reused without re-compiling.
const ajv = new Ajv({ allErrors: true });
export const validateAuthPolicy = ajv.compile<AuthPolicy>(AuthPolicySchema);
