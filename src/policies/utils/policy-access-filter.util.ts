import { Request } from "express";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "src/casl/action.enum";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { IPolicyFilterV4 } from "../interfaces/policy-filters.interface";
import { Policy } from "../schemas/policy.schema";

// Users who can list their own policies but not all of them are restricted
// to policies for a group they belong to, or ones already public.
// Unauthenticated requests (v3 has no separate public endpoint, unlike v4)
// see only published policies.
export function restrictToOwnPolicies(
  caslAbilityFactory: CaslAbilityFactory,
  request: Request,
  mergedFilters: IPolicyFilterV4,
): IPolicyFilterV4 {
  const user = request.user as JWTUser;
  const ability = caslAbilityFactory.policyAccess(user);
  const canViewAny = ability.can(Action.AccessAny, Policy);
  const canView = ability.can(Action.Read, Policy);

  mergedFilters.where = mergedFilters.where ?? {};

  if (!user) {
    mergedFilters.where["$and"] = mergedFilters.where["$and"] ?? [];
    mergedFilters.where["$and"].push({ isPublished: true });
  } else if (!canViewAny && canView) {
    mergedFilters.where["$and"] = mergedFilters.where["$and"] ?? [];
    mergedFilters.where["$and"].push({
      $or: [
        { ownerGroup: { $in: user.currentGroups } },
        { accessGroups: { $in: user.currentGroups } },
        { isPublished: true },
      ],
    });
  }

  return mergedFilters;
}
