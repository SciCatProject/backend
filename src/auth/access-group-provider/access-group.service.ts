import { UserPayload } from "../interfaces/userPayload.interface";

export abstract class AccessGroupService {
  abstract getAccessGroups(
    //idpPayload: Record<string, unknown>,
    userPayload: UserPayload,
  ): Promise<string[]>;
}
