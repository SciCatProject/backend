//import { AccessGroupService as AccessGroupService } from "./access-group.service";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AccessGroupService } from "./access-group.service";
import { UserPayload } from "src/auth/interfaces/userPayload.interface";

/**
 * This service is used to get the access groups from the payload of the IDP.
 */
@Injectable()
export class AccessGroupFromPayloadService extends AccessGroupService {
  constructor(private configService: ConfigService) {
    super();
  }

  async getAccessGroups(userPayload: UserPayload): Promise<string[]> {
    //const defaultAccessGroups: string[] = [];
    const accessGroups: string[] = [];

    const accessGroupsProperty = userPayload.accessGroupProperty;
    if (accessGroupsProperty) {
      const payload: Record<string, unknown> | undefined = userPayload.payload;
      if (
        payload !== undefined &&
        Array.isArray(payload[accessGroupsProperty])
      ) {
        for (const group of payload[accessGroupsProperty]) {
          if (typeof group === "string") {
            accessGroups.push(group);
          }
        }
      }
      Logger.log(accessGroups, "AccessGroupFromPayloadService");
    }

    return accessGroups;
  }
}
