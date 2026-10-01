import { Injectable, Logger } from "@nestjs/common";
import { UserPayload } from "../interfaces/userPayload.interface";
import { AccessGroupService } from "./access-group.service";

/**
 * This service is used to get the access groups from the payload of the ldap IDP.
 */
@Injectable()
export class AccessGroupFromLdapService extends AccessGroupService {
  constructor(private accessGroupProperty: string) {
    super();
  }

  async getAccessGroups(userPayload: UserPayload): Promise<string[]> {
    const accessGroups: string[] = [];

    const accessGroupsProperty = this.accessGroupProperty;
    if (accessGroupsProperty) {
      const payload: Record<string, unknown> | undefined = userPayload.payload;
      if (payload !== undefined && Array.isArray(payload["_groups"])) {
        for (const group of payload["_groups"]) {
          if (
            typeof group === "object" &&
            accessGroupsProperty in group &&
            typeof group[accessGroupsProperty] === "string"
          ) {
            accessGroups.push(group[accessGroupsProperty]);
          }
        }
      }
      Logger.log(accessGroups, "AccessGroupFromLdapService");
    }
    return accessGroups;
  }
}
