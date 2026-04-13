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
import { UsersService } from "src/users/users.service";
import { OidcConfig } from "src/config/configuration";
import { BuildOpenIdClient, OidcStrategy } from "./strategies/oidc.strategy";
import { accessGroupServiceFactory } from "./access-group-provider/access-group-service-factory";
import { AccessGroupService } from "./access-group-provider/access-group.service";
import { CaslModule } from "src/casl/casl.module";
import { SessionMiddleware } from "./middlewares/session.middleware";

const OidcStrategyFactory = {
  provide: "OidcStrategy",
  useFactory: async (
    authService: AuthService,
    configService: ConfigService,
    userService: UsersService,
    accessGroupService: AccessGroupService,
  ) => {
    if (!configService.get<OidcConfig>("oidc")?.issuer) {
      return null;
    }
    const clientBuilder = new BuildOpenIdClient(configService);
    const client = await clientBuilder.build();
    const strategy = new OidcStrategy(
      authService,
      client,
      configService,
      userService,
      accessGroupService,
    );
    return strategy;
  },
  inject: [AuthService, ConfigService, UsersService, AccessGroupService],
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
