/**
 * A single CASL rule entry in the auth policy JSON.
 * - action: a simple CASL action string, e.g. "read", "create", "manage"
 * - subject: a subject name string that maps via SUBJECTS to an actual class,
 *            e.g. "Dataset", "Proposal", "all"
 * - conditions: optional MongoDB-style condition object; values may include
 *               placeholders such as "{{user.currentGroups}}"
 */
export interface AuthPolicyRuleEntry {
  action: string;
  subject: string;
  conditions?: Record<string, unknown>;
}

/**
 * A set of CASL can / cannot rules for one group or the instance-layer defaults.
 */
export interface AuthPolicyGroupRules {
  can: AuthPolicyRuleEntry[];
  cannot: AuthPolicyRuleEntry[];
}

/**
 * The `endpoints` section of the policy.
 *
 * - defaults: can-rules applied to every user (including unauthenticated).
 * - groups: per-group can / cannot overrides for authenticated users.
 */
export interface AuthPolicyEndpointSection {
  defaults?: AuthPolicyRuleEntry[];
  groups?: Record<string, AuthPolicyGroupRules>;
}

/**
 * The `instance` section of the policy.
 *
 * - defaults: can / cannot rules applied to every user (including unauthenticated)
 *             when querying individual data instances. Conditions are resolved
 *             against the current user where needed.
 * - groups: per-group can / cannot overrides with optional conditions.
 */
export interface AuthPolicyInstanceSection {
  defaults?: AuthPolicyGroupRules;
  groups?: Record<string, AuthPolicyGroupRules>;
}

/**
 * Root shape of an auth-policy.json file.
 */
export interface AuthPolicy {
  version: number;
  endpoints: AuthPolicyEndpointSection;
  instance: AuthPolicyInstanceSection;
}
