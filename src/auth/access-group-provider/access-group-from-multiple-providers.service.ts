import { Injectable } from "@nestjs/common";
import { AccessGroupService } from "./access-group.service";
import { UserPayload } from "src/auth/interfaces/userPayload.interface";

/**
 * This service is used to get the access groups from multiple providers.
 */
@Injectable()
export class AccessGroupFromMultipleProvidersService extends AccessGroupService {
  constructor(private accessGroupProviders: AccessGroupService[]) {
    super();
  }

  async getAccessGroups(userPayload: UserPayload): Promise<string[]> {
    const accessGroups: string[] = [];

    for (const accessGroupProvider of this.accessGroupProviders) {
      const accessGroupsFromProvider =
        await accessGroupProvider.getAccessGroups(userPayload);

      accessGroups.push(
        ...accessGroupsFromProvider.filter((group) => group.trim() !== ""),
      );
    }

    return accessGroups;
  }
}
