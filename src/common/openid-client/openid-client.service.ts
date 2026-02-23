import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Client,
  IdTokenClaims,
  Issuer,
  UserinfoResponse,
  custom,
} from "openid-client";
import { Profile } from "passport";
import { OidcConfig } from "src/config/configuration";
import { UserProfile } from "src/users/schemas/user-profile.schema";

export type extendedIdTokenClaims = IdTokenClaims &
  UserinfoResponse & {
    groups?: string[];
  };
export type OidcProfile = Profile & UserProfile;

@Injectable()
export class OidcClientService {
  private client: Client | null = null;
  private oidcConfig?: OidcConfig;

  constructor(private configService: ConfigService) {
    this.oidcConfig = this.configService.get<OidcConfig>("oidc");

    // Set a reasonable timeout for HTTP requests made by the openid-client library
    custom.setHttpOptionsDefaults({
      timeout: 7000,
    });
  }

  async getClient(): Promise<Client> {
    if (this.client) return this.client;

    if (!this.oidcConfig?.clientID) {
      throw new Error("OIDC clientID not defined in the configuration.");
    }
    try {
      const issuer = await Issuer.discover(
        `${this.oidcConfig.issuer}/.well-known/openid-configuration`,
      );

      this.client = new issuer.Client({
        client_id: this.oidcConfig.clientID,
        client_secret: this.oidcConfig.clientSecret,
      });

      return this.client;
    } catch (err) {
      throw new Error(
        `OIDC issuer discovery failed: ${err instanceof Error ? err.message : err}`,
      );
    }
  }
}
