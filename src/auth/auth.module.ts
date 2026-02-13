import { MiddlewareConsumer, Module, RequestMethod } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { UsersModule } from "../users/users.module";
import { PassportModule } from "@nestjs/passport";
import { LocalStrategy } from "./strategies/local.strategy";
import { AuthController } from "./auth.controller";
import { JwtModule } from "@nestjs/jwt";
import { JwtStrategy } from "./strategies/jwt.strategy";
import { LdapStrategy } from "./strategies/ldap.strategy";
import { ConfigService } from "@nestjs/config";
import { OidcConfig } from "src/config/configuration";
import { OidcStrategy } from "./strategies/oidc.strategy";
import { accessGroupServiceFactory } from "./access-group-provider/access-group-service-factory";
import { CaslModule } from "src/casl/casl.module";
import { SessionMiddleware } from "./middlewares/session.middleware";
import { OidcClientService } from "../common/openid-client/openid-cilent.service";
import { OidcAuthService } from "src/common/openid-client/openid-auth.service";

const OidcStrategyFactory = {
  provide: "OidcStrategy",
  useFactory: async (
    oidcClientService: OidcClientService,
    oidcAuthService: OidcAuthService,
    configService: ConfigService,
  ) => {
    if (!configService.get<OidcConfig>("oidc")?.issuer) {
      return null;
    }

    const client = await oidcClientService.getClient();

    const strategy = new OidcStrategy(client, configService, oidcAuthService);
    return strategy;
  },
  inject: [OidcClientService, OidcAuthService, ConfigService],
};

@Module({
  imports: [
    CaslModule,
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: { expiresIn: configService.get<number>("jwt.expiresIn") },
      }),
      inject: [ConfigService],
    }),
    PassportModule.register({
      defaultStrategy: "jwt",
      property: "user",
      session: false,
    }),
    UsersModule,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    LdapStrategy,
    LocalStrategy,
    OidcStrategyFactory,
    accessGroupServiceFactory,
  ],
  controllers: [AuthController],
  exports: [AuthService, JwtModule, PassportModule],
})
export class AuthModule {
  constructor(private configService: ConfigService) {}

  configure(consumer: MiddlewareConsumer) {
    if (!this.configService.get<string>("expressSession.secret")) return;
    consumer
      .apply(SessionMiddleware)
      .forRoutes(
        { path: "auth/oidc", method: RequestMethod.GET, version: "3" },
        { path: "auth/oidc/callback", method: RequestMethod.GET, version: "3" },
        { path: "auth/logout", method: RequestMethod.POST, version: "3" },
      );
  }
}
