import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { Request } from "express";
import type {
  Configuration,
  TokenEndpointResponse,
  TokenEndpointResponseHelpers,
} from "openid-client";
import type { StrategyOptionsWithRequest } from "openid-client/passport";
import { Strategy } from "openid-client/passport";
import { OidcAuthService } from "src/common/openid-client/openid-auth.service";
import { OidcConfig } from "src/config/configuration";
import { User } from "src/users/schemas/user.schema";

type OidcTokenSet = TokenEndpointResponse & TokenEndpointResponseHelpers;

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, "oidc") {
  authStrategy = "oidc";

  constructor(
    private config: Configuration,
    configService: ConfigService,
    private oidcAuthService: OidcAuthService,
  ) {
    const oidcConfig = configService.get<OidcConfig>("oidc");
    super({
      config: config,
      callbackURL: oidcConfig?.callbackURL,
      scope: oidcConfig?.scope,
      passReqToCallback: true,
    } as StrategyOptionsWithRequest);
  }

  async validate(
    req: Request,
    tokenset: OidcTokenSet,
  ): Promise<Omit<User, "password">> {
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
    return this.oidcAuthService.validate(tokenset, this.config);
  }
}
