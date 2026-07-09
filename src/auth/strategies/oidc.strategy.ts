import { Injectable } from "@nestjs/common";
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

  constructor(
    private client: Client,
    configService: ConfigService,
    private oidcAuthService: OidcAuthService,
  ) {
    const oidcConfig = configService.get<OidcConfig>("oidc");
    super({
      client: client,
      params: {
        redirect_uri: oidcConfig?.callbackURL,
        scope: oidcConfig?.scope,
      },
      passReqToCallback: true,
      usePKCE: false,
    });
  }

  async validate(
    req: Request,
    tokenset: TokenSet,
  ): Promise<Omit<User, "password">> {
    if (tokenset.id_token) {
      req.session.idToken = tokenset.id_token;
    }
    if (tokenset.access_token) {
      req.session.accessToken = tokenset.access_token;
    }
    if (tokenset.refresh_token) {
      req.session.refreshToken = tokenset.refresh_token;
    }
    return this.oidcAuthService.validate(tokenset, this.client);
  }
}
