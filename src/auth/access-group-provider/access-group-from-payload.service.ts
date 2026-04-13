//import { AccessGroupService as AccessGroupService } from "./access-group.service";
import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { UserPayload } from "../interfaces/userPayload.interface";
import { AccessGroupService } from "./access-group.service";

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
    let accessGroups: string[] = [];

    const accessGroupsProperty = userPayload.accessGroupProperty;
    if (accessGroupsProperty) {
      const payload: Record<string, unknown> | undefined = userPayload.payload;
      if (
        payload !== undefined &&
        Array.isArray(payload[accessGroupsProperty])
      ) {
        accessGroups =
          payload[accessGroupsProperty] !== undefined
            ? (payload[accessGroupsProperty] as string[])
            : [];
      }
      Logger.log(accessGroups, "AccessGroupFromPayloadService");
    }

    return accessGroups;
  }
}
