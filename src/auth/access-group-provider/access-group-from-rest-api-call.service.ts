import { AccessGroupService as AccessGroupService } from "./access-group.service";
import { Injectable, Logger } from "@nestjs/common";
///import fetch from "node-fetch";

import { UserPayload } from "../interfaces/userPayload.interface";
import { HttpService } from "@nestjs/axios";
import { firstValueFrom } from "rxjs";
import { get } from "lodash";
import { AxiosError } from "axios";
/**
 * This service is used to fetch access groups from a REST API.
 */
@Injectable()
export class AccessGroupFromRestApiService extends AccessGroupService {
  constructor(
    private apiUrl: string,
    private headers: Record<string, string>,
    private userIdfield: string,
    private readonly httpService: HttpService,
  ) {
    super();
  }

  async getAccessGroups(userPayload: UserPayload): Promise<string[]> {
    const userId = get(userPayload, this.userIdfield) as string;
    if (!userId) {
      Logger.error(`User ID not found in payload: ${this.userIdfield}`);
      return [];
    }
    const url = this.apiUrl.replace("{userId}", userId);

    const responseData = await this.callRestApi(url);
    if (!responseData) {
      Logger.warn("No access groups returned from REST API");
      return [];
    }
    return responseData;
  }

  async callRestApi(url: string): Promise<string[]> {
    try {
      const response = await firstValueFrom(
        this.httpService.get<string[]>(url, {
          headers: {
            ...this.headers,
          },
        }),
      );

      if (!response || !response.data) {
        Logger.warn("No access groups returned from REST API");
        return [];
      }

      return response.data;
    } catch (err: unknown) {
      if (err instanceof AxiosError) {
        Logger.warn(
          `Status: ${err.response?.status}, Body: ${JSON.stringify(err.response?.data)}`,
        );
      } else if (err instanceof Error) {
        Logger.error(err.message);
      } else {
        Logger.error("Unknown error occurred");
      }
      return [];
    }
  }
}
