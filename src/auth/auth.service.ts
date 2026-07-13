import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcrypt";
import { User } from "src/users/schemas/user.schema";
import { UsersService } from "../users/users.service";
import { Request } from "express";
import { OidcConfig } from "src/config/configuration";
import { parseBoolean } from "src/common/utils";
import { TokenSet } from "openid-client";
import { ReturnedAuthLoginDto } from "./dto/returnedLogin.dto";
import { ReturnedUserDto } from "src/users/dto/returned-user.dto";
import { CreateUserSettingsDto } from "src/users/dto/create-user-settings.dto";
import { OidcClientService } from "../common/openid-client/openid-client.service";
import { OidcAuthService } from "src/common/openid-client/openid-auth.service";
import { TokenRefreshService } from "src/auth/services/token-refresh.service";

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private oidcClientService: OidcClientService,
    private oidcAuthService: OidcAuthService,
    private jwtService: JwtService,
    private tokenRefreshService: TokenRefreshService,
  ) {}

  async validateUser(
    username: string,
    pass: string,
  ): Promise<Omit<User, "password"> | null> {
    const user = await this.usersService.findOne({ username }, true);

    if (!user) {
      return null;
    }

    // Hacky deep copy of User object, as shallow copy is not enough
    const { password, ...result } = JSON.parse(JSON.stringify(user));
    const match = await compare(pass, password);

    if (!match) {
      return null;
    }

    return result;
  }

  async login(user: Omit<User, "password">): Promise<ReturnedAuthLoginDto> {
    const expiresIn = this.configService.get<number>("jwt.expiresIn");
    const accessToken = this.jwtService.sign(user, { expiresIn });
    await this.postLoginTasks(user);
    return {
      access_token: accessToken,
      id: accessToken,
      expires_in: expiresIn,
      ttl: expiresIn,
      created: new Date().toISOString(),
      userId: user._id,
      user: user as ReturnedUserDto,
    };
  }

  async oidcTokenLogin(idToken: string): Promise<ReturnedAuthLoginDto> {
    let tokenSet: TokenSet;
    const client = await this.oidcClientService.getClient();
    const callbackUrl = this.configService.get<string>("oidc.callbackURL");

    try {
      tokenSet = await client.callback(callbackUrl, { id_token: idToken }, {});
    } catch (error) {
      throw new UnauthorizedException(
        `Invalid idToken: ${(error as Error).message}`,
      );
    }
    const user = await this.oidcAuthService.validate(tokenSet);
    const expiresIn = this.configService.get<number>("jwt.expiresIn");
    const accessToken = this.jwtService.sign(user, { expiresIn });
    await this.postLoginTasks(user);

    return {
      access_token: accessToken,
      id: accessToken,
      expires_in: expiresIn,
      ttl: expiresIn,
      created: new Date().toISOString(),
      userId: user._id,
      user: user as ReturnedUserDto,
    };
  }

  async logout(req: Request) {
    const logoutURL = this.configService.get<string>("logoutURL") || "";
    const expressSessionSecret = this.configService.get<string>(
      "expressSession.secret",
    );

    this.tokenRefreshService.stopSessionRefresh(req.sessionID);

    const logoutResult = await this.additionalLogoutTasks(req, logoutURL);

    if (expressSessionSecret) {
      delete req.session?.idToken;
      delete req.session?.accessToken;
      delete req.session?.refreshToken;

      req.logout(async (err) => {
        if (err) {
          Logger.error("Logout error: ", err);
        }
      });

      return logoutResult;
    } else {
      return logoutResult;
    }
  }

  startOidcSessionRefresh(req: Request): void {
    if (!req.session?.refreshToken) {
      Logger.debug(
        "OIDC session refresh not started: no refresh token in session",
      );
      return;
    }

    const oidcConfig = this.configService.get<OidcConfig>("oidc");
    if (oidcConfig?.tokenRefreshEnabled === false) {
      Logger.debug(
        "OIDC session refresh not started: tokenRefreshEnabled is false",
      );
      return;
    }

    const userId = (req.user as Omit<User, "password">)?._id;
    const userinfoEnabled = oidcConfig?.userinfoEnabled !== false;

    Logger.log(
      `Starting OIDC session refresh for session ${req.sessionID} (userinfoEnabled: ${userinfoEnabled})`,
    );

    this.tokenRefreshService.startSessionRefresh(
      req.sessionID,
      {
        getTokens: () => ({
          refreshToken: req.session?.refreshToken,
          accessToken: req.session?.accessToken,
          expiresIn: req.session?.expiresIn,
        }),
        setTokens: (tokens) => {
          if (req.session) {
            req.session.idToken = tokens.idToken;
            if (tokens.accessToken)
              req.session.accessToken = tokens.accessToken;
            if (tokens.refreshToken)
              req.session.refreshToken = tokens.refreshToken;
            if (tokens.expiresIn) req.session.expiresIn = tokens.expiresIn;
          }
        },
      },
      userId && userinfoEnabled
        ? async (accessToken: string) => {
            const client = await this.oidcClientService.getClient();
            await this.oidcAuthService.refreshUserAccessGroups(
              userId,
              client,
              accessToken,
            );
          }
        : undefined,
    );
  }

  async additionalLogoutTasks(req: Request, logoutURL: string) {
    const user = req.user as Omit<User, "password">;
    if (!user) {
      throw new HttpException(`Not logged in`, HttpStatus.UNAUTHORIZED);
    }
    if (user?.authStrategy === "oidc") {
      const oidcConfig = this.configService.get<OidcConfig>("oidc");
      const autoLogout: boolean = parseBoolean(oidcConfig?.autoLogout || true);

      if (autoLogout) {
        if (logoutURL) {
          return {
            logout: "successful",
            logoutURL: logoutURL,
          };
        }

        const idToken = req.session?.idToken;

        try {
          const client = await this.oidcClientService.getClient();
          const endSessionUrl = client.endSessionUrl({
            id_token_hint: idToken,
            post_logout_redirect_uri: oidcConfig?.callbackURL
              ? oidcConfig.callbackURL.replace(
                  "/auth/oidc/callback",
                  "/auth/logout",
                )
              : undefined,
            client_id: oidcConfig?.clientID,
          });

          if (endSessionUrl) {
            return {
              logout: "successful",
              logoutURL: endSessionUrl,
            };
          }
        } catch (error) {
          Logger.warn(
            `Failed to build OIDC logout URL: ${(error as Error).message}`,
          );
        }
      }
    }

    return { logout: "successful" };
  }
  /**
   * postLoginTasks: Executes additional tasks after user login.
   *
   * - Checks if the user has userSettings record.
   * - If user has no userSetting, it creates default userSetting for the user.
   * @param user - The logged-in user (without password).
   */
  async postLoginTasks(user: Omit<User, "password">) {
    if (!user) return;

    const userId = user._id;

    const userSettings = await this.usersService.findByIdUserSettings(userId);

    if (!userSettings) {
      Logger.log(
        `Adding default settings to user ${user.username} with userId: ${user._id}`,
        "postLoginTasks",
      );
      const createUserSettingsDto: CreateUserSettingsDto = {
        userId,
        externalSettings: {},
      };
      await this.usersService.createUserSettings(userId, createUserSettingsDto);
    }
  }
}
