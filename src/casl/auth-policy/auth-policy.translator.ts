import {
  AbilityBuilder,
  ExtractSubjectType,
  InferSubjects,
  MongoAbility,
  MongoQuery,
  createMongoAbility,
} from "@casl/ability";
import { BadRequestException, Injectable } from "@nestjs/common";
import { Attachment } from "src/attachments/schemas/attachment.schema";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Datablock } from "src/datablocks/schemas/datablock.schema";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { Instrument } from "src/instruments/schemas/instrument.schema";
import { JobClass } from "src/jobs/schemas/job.schema";
import { Logbook } from "src/logbooks/schemas/logbook.schema";
import { MetadataKeyClass } from "src/metadata-keys/schemas/metadatakey.schema";
import { OrigDatablock } from "src/origdatablocks/schemas/origdatablock.schema";
import { Policy } from "src/policies/schemas/policy.schema";
import { ProposalClass } from "src/proposals/schemas/proposal.schema";
import { PublishedData } from "src/published-data/schemas/published-data.schema";
import { RuntimeConfig } from "src/config/runtime-config/schemas/runtime-config.schema";
import { SampleClass } from "src/samples/schemas/sample.schema";
import { User } from "src/users/schemas/user.schema";
import { AuthPolicy, AuthPolicyRuleEntry } from "./auth-policy.interface";
import { resolveSubject } from "./auth-policy-subjects";

/**
 * Subject union that covers all Mongoose document classes used in this
 * system.  Mirrors the `Subjects` type in `casl-ability.factory.ts` so that
 * `PolicyAbility` can be used wherever `AppAbility` is expected.
 */
type PolicySubjects =
  | string
  | InferSubjects<
      | typeof Attachment
      | typeof Datablock
      | typeof DatasetClass
      | typeof Instrument
      | typeof JobClass
      | typeof Logbook
      | typeof MetadataKeyClass
      | typeof OrigDatablock
      | typeof Policy
      | typeof ProposalClass
      | typeof PublishedData
      | typeof RuntimeConfig
      | typeof SampleClass
      | typeof User
    >
  | "all";

export type PolicyAbility = MongoAbility<[string, PolicySubjects], MongoQuery>;

/**
 * Translates an {@link AuthPolicy} (loaded from `auth-policy.json`) into a
 * CASL `MongoAbility` instance for either the **endpoint** layer (no DB
 * queries; used in guards) or the **instance** layer (with conditions; used
 * in services via `accessibleBy`).
 *
 * ## Rule precedence
 * Rules are added in this order so that CASL's "last rule wins" behaviour
 * produces the intended semantics:
 *
 *   1. `defaults.can`  – baseline permissions for every user
 *   2. `defaults.cannot`
 *   3. Per-group `can`  – applied only for authenticated users whose
 *                          `currentGroups` contains the group name
 *   4. Per-group `cannot` – always wins over the matching group's `can`
 *
 * @see https://casl.js.org/v4/en/guide/define-rules (rule precedence)
 */
@Injectable()
export class AuthPolicyTranslator {
  // -----------------------------------------------------------------------
  // Public API
  // -----------------------------------------------------------------------

  /**
   * Build an **endpoint** ability from the `endpoints` section of the policy.
   * Endpoint abilities carry no Mongo conditions; they are used purely as
   * fast yes/no guards at the controller level.
   *
   * @param policy  The validated auth policy.
   * @param user    The current JWT user, or `null` for unauthenticated users.
   */
  buildEndpointAbility(
    policy: AuthPolicy,
    user: JWTUser | null,
  ): PolicyAbility {
    const { can, cannot, build } = new AbilityBuilder<PolicyAbility>(
      createMongoAbility,
    );

    // 1. Defaults – applied for ALL users (including unauthenticated)
    for (const rule of policy.endpoints.defaults ?? []) {
      can(rule.action, resolveSubject(rule.subject));
    }

    // 2. Group rules – only for authenticated users
    if (user) {
      for (const [groupName, groupRules] of Object.entries(
        policy.endpoints.groups ?? {},
      )) {
        if (user.currentGroups.includes(groupName)) {
          // can before cannot (cannot wins for same scope)
          for (const rule of groupRules.can ?? []) {
            can(rule.action, resolveSubject(rule.subject));
          }
          for (const rule of groupRules.cannot ?? []) {
            cannot(rule.action, resolveSubject(rule.subject));
          }
        }
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<PolicySubjects>,
    });
  }

  /**
   * Build an **instance** ability from the `instance` section of the policy.
   * Instance abilities carry Mongo conditions (e.g. `{ isPublished: true }`)
   * that can be pushed directly into a DB query via `accessibleBy(ability)`.
   *
   * Placeholder strings in conditions (e.g. `"{{user.currentGroups}}"`) are
   * resolved against the current user before the ability is built.
   *
   * @param policy  The validated auth policy.
   * @param user    The current JWT user, or `null` for unauthenticated users.
   */
  buildInstanceAbility(
    policy: AuthPolicy,
    user: JWTUser | null,
  ): PolicyAbility {
    const { can, cannot, build } = new AbilityBuilder<PolicyAbility>(
      createMongoAbility,
    );

    // 1. Defaults – applied for ALL users
    for (const rule of policy.instance.defaults?.can ?? []) {
      applyRule(can, rule.action, resolveSubject(rule.subject), resolvePlaceholders(rule, user));
    }
    for (const rule of policy.instance.defaults?.cannot ?? []) {
      applyRule(cannot, rule.action, resolveSubject(rule.subject), resolvePlaceholders(rule, user));
    }

    // 2. Group rules – only for authenticated users
    if (user) {
      for (const [groupName, groupRules] of Object.entries(
        policy.instance.groups ?? {},
      )) {
        if (user.currentGroups.includes(groupName)) {
          for (const rule of groupRules.can ?? []) {
            applyRule(can, rule.action, resolveSubject(rule.subject), resolvePlaceholders(rule, user));
          }
          for (const rule of groupRules.cannot ?? []) {
            applyRule(cannot, rule.action, resolveSubject(rule.subject), resolvePlaceholders(rule, user));
          }
        }
      }
    }

    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<PolicySubjects>,
    });
  }
}

// -----------------------------------------------------------------------
// Helpers (module-private)
// -----------------------------------------------------------------------

/**
 * Calls `can(action, subject)` or `can(action, subject, conditions)` on the
 * provided `can`/`cannot` builder function.  When `conditions` is `undefined`
 * the third argument is omitted entirely so that CASL treats the rule as a
 * class-level (unconditional) rule rather than an instance-level conditional
 * rule.  Passing an empty `{}` would silently be treated as a conditional
 * rule in CASL v5+, which breaks class-constructor checks.
 */
function applyRule(
  fn: (action: string, subject: PolicySubjects, conditions?: MongoQuery) => void,
  action: string,
  subject: PolicySubjects,
  conditions: Record<string, unknown> | undefined,
): void {
  if (conditions !== undefined) {
    fn(action, subject, conditions as MongoQuery);
  } else {
    fn(action, subject);
  }
}

/**
 * Resolve placeholder strings in a rule's `conditions` object.
 *
 * Supported placeholder syntax: `"{{user.<field>}}"`.
 * When the resolved value is an array it is automatically wrapped in
 * `{ $in: value }` so that the condition becomes a valid Mongo `$in` filter.
 *
 * @throws BadRequestException when a placeholder cannot be resolved
 *         (e.g. the user is `null` but a `{{user.*}}` placeholder appears in
 *         a rule that is supposed to run for unauthenticated users).
 */
export function resolvePlaceholders(
  rule: AuthPolicyRuleEntry,
  user: JWTUser | null,
): Record<string, unknown> | undefined {
  if (!rule.conditions) {
    return undefined;
  }

  const resolved: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(rule.conditions)) {
    if (
      typeof value === "string" &&
      value.startsWith("{{") &&
      value.endsWith("}}")
    ) {
      const path = value.slice(2, -2).trim(); // e.g. "user.currentGroups"
      const [namespace, ...rest] = path.split(".");
      const fieldName = rest.join(".");

      if (namespace !== "user") {
        throw new BadRequestException(
          `Unsupported placeholder namespace "${namespace}" in condition "${key}". ` +
            `Only "user.*" placeholders are supported.`,
        );
      }
      if (!user) {
        throw new BadRequestException(
          `Cannot resolve placeholder "${value}" in condition "${key}": ` +
            `no authenticated user is available.`,
        );
      }

      const fieldValue = (user as unknown as Record<string, unknown>)[fieldName];

      if (fieldValue === undefined) {
        throw new BadRequestException(
          `Cannot resolve placeholder "${value}" in condition "${key}": ` +
            `user.${fieldName} is undefined.`,
        );
      }

      // Arrays become { $in: [...] } so they work as Mongo filters
      resolved[key] = Array.isArray(fieldValue)
        ? { $in: fieldValue }
        : fieldValue;
    } else {
      resolved[key] = value;
    }
  }

  return resolved;
}
