import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserPayload } from "../interfaces/userPayload.interface";
import { AccessGroupService } from "./access-group.service";

/**
 * This service is used to get the access groups from the payload of the ldap IDP.
 */
@Injectable()
export class AccessGroupFromLdapService extends AccessGroupService {
  constructor(private configService: ConfigService) {
    super();
  }

  async getAccessGroups(userPayload: UserPayload): Promise<string[]> {
    let accessGroups: string[] = [];

    const accessGroupsProperty = userPayload.accessGroupProperty;
    if (accessGroupsProperty) {
      const payload: Record<string, unknown> | undefined = userPayload.payload;
      if (
        payload !== undefined &&
        Array.isArray(payload[accessGroupsProperty])
      ) {
        for (const group of payload[accessGroupsProperty]) {
          if (
              typeof group === "object" &&
              "cn" in group &&
              typeof group["cn"] === "string"
          ) {
            accessGroups.push(group["cn"]);
          }
        }
      }
      Logger.log(accessGroups, "AccessGroupFromLdapService");
    }
    return accessGroups;
  }
}
