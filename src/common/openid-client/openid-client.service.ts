import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import type { IDToken, UserInfoResponse } from "openid-client";
import {
  ClientSecretPost,
  Configuration,
  discovery,
  refreshTokenGrant,
} from "openid-client";
import { Profile } from "passport";
import { OidcConfig } from "src/config/configuration";
import { UserProfile } from "src/users/schemas/user-profile.schema";

export type extendedIdTokenClaims = IDToken &
  UserInfoResponse & {
    groups?: string[];
  };
export type OidcProfile = Profile & UserProfile;

@Injectable()
export class OidcClientService {
  private config: Configuration | null = null;
  private oidcConfig?: OidcConfig;

  constructor(private configService: ConfigService) {
    this.oidcConfig = this.configService.get<OidcConfig>("oidc");
  }

  async getClient(): Promise<Configuration> {
    if (this.config) return this.config;

    if (!this.oidcConfig?.clientID) {
      throw new Error("OIDC clientID not defined in the configuration.");
    }
    try {
      const issuerUrl = new URL(this.oidcConfig.issuer!);

      this.config = await discovery(
        issuerUrl,
        this.oidcConfig.clientID,
        { client_secret: this.oidcConfig.clientSecret },
        ClientSecretPost(this.oidcConfig.clientSecret),
        { timeout: 7 },
      );

      return this.config;
    } catch (err) {
      throw new Error(
        `OIDC issuer discovery failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }

  async refreshToken(refreshToken: string): Promise<{
    idToken: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  }> {
    const config = await this.getClient();
    try {
      const tokenResponse = await refreshTokenGrant(config, refreshToken);
      const result: {
        idToken: string;
        accessToken?: string;
        refreshToken?: string;
        expiresIn?: number;
      } = {
        idToken: tokenResponse.id_token ?? "",
        accessToken: tokenResponse.access_token ?? undefined,
        refreshToken: tokenResponse.refresh_token ?? undefined,
        expiresIn: tokenResponse.expires_in ?? undefined,
      };
      if (!result.idToken) {
        Logger.warn("Token refresh returned no id_token");
        throw new Error("Token refresh returned no id_token");
      }
      return result;
    } catch (error) {
      throw new Error(
        `OIDC token refresh failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }
}
