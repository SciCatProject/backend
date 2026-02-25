import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PassportStrategy } from "@nestjs/passport";

import { User } from "src/users/schemas/user.schema";
import { Strategy, Client, TokenSet } from "openid-client";
import { OidcConfig } from "src/config/configuration";
import { OidcAuthService } from "src/common/openid-client/openid-auth.service";

@Injectable()
export class OidcStrategy extends PassportStrategy(Strategy, "oidc") {
  authStrategy = "oidc";

  constructor(
    client: Client,
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
      passReqToCallback: false,
      usePKCE: false,
    });
  }

  async validate(tokenset: TokenSet): Promise<Omit<User, "password">> {
    return this.oidcAuthService.validate(tokenset);
  }
}
