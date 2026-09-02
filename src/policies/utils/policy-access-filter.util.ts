import { Request } from "express";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { Action } from "src/casl/action.enum";
import { CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { IFilters } from "src/common/interfaces/common.interface";
import { IPolicyFilter } from "../interfaces/policy-filters.interface";
import { Policy, PolicyDocument } from "../schemas/policy.schema";

// Users who can list their own policies but not all of them are restricted
// to policies for a group they belong to, or ones already public.
export function restrictToOwnPolicies(
  caslAbilityFactory: CaslAbilityFactory,
  request: Request,
  mergedFilters: IFilters<PolicyDocument, IPolicyFilter>,
): IFilters<PolicyDocument, IPolicyFilter> {
  const user = request.user as JWTUser;
  if (!user) return mergedFilters;

  const ability = caslAbilityFactory.policyAccess(user);
  const canViewAll = ability.can(Action.ListAll, Policy);
  const canViewTheirOwn = ability.can(Action.ListOwn, Policy);
  if (!canViewAll && canViewTheirOwn) {
    if (!mergedFilters.where) {
      mergedFilters.where = {};
    }
    mergedFilters.where["$or"] = [
      { ownerGroup: { $in: user.currentGroups } },
      { accessGroups: { $in: user.currentGroups } },
      { isPublished: true },
    ];
  }

  return mergedFilters;
}
