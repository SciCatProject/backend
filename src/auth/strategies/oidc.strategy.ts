import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { User } from "src/users/schemas/user.schema";
import { Strategy, Client, TokenSet } from "openid-client";
import { OidcConfig } from "src/config/configuration";
import { OidcAuthService } from "src/common/openid-client/openid-auth.service";
import { Request } from "express";

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, "oidc") {
  authStrategy = "oidc";
  private additionalAuthorizedParties: string[];

  constructor(
    private client: Client,
    configService: ConfigService,
    private oidcAuthService: OidcAuthService,
  ) {
    const oidcConfig = configService.get<OidcConfig>("oidc");
    const additionalAuthorizedParties =
      oidcConfig?.additionalAuthorizedParties ?? [];
    super({
      client: client,
      params: {
        redirect_uri: oidcConfig?.callbackURL,
        scope: oidcConfig?.scope,
      },
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
    this.additionalAuthorizedParties = additionalAuthorizedParties;
  }

  async validate(
    req: Request,
    tokenset: TokenSet,
  ): Promise<Omit<User, "password">> {
    if (this.additionalAuthorizedParties.length > 0 && tokenset.id_token) {
      const claims = tokenset.claims();
      const azp = claims?.azp;
      if (azp && !this.additionalAuthorizedParties.includes(azp)) {
        Logger.warn(
          `Token azp "${azp}" not in additional authorized parties: ${this.additionalAuthorizedParties.join(", ")}`,
        );
      }
    }

    if (req.session) {
      if (tokenset.id_token) {
        req.session.idToken = tokenset.id_token;
      }
      if (tokenset.access_token) {
        req.session.accessToken = tokenset.access_token;
      }
      if (tokenset.refresh_token) {
        req.session.refreshToken = tokenset.refresh_token;
      }
      if (tokenset.expires_in) {
        req.session.expiresIn = tokenset.expires_in;
      }
    }
    return this.oidcAuthService.validate(tokenset, this.client);
  }
}
