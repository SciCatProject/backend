import { HttpException, HttpStatus, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { compare } from "bcrypt";
import { User } from "src/users/schemas/user.schema";
import { UsersService } from "../users/users.service";
import { Request } from "express";
import { OidcConfig } from "src/config/configuration";
import { flattenObject, parseBoolean } from "src/common/utils";
import { Issuer } from "openid-client";
import { ReturnedAuthLoginDto } from "./dto/returnedLogin.dto";
import { ReturnedUserDto } from "src/users/dto/returned-user.dto";
import { CreateUserSettingsDto } from "src/users/dto/create-user-settings.dto";

@Injectable()
export class AuthService {
  constructor(
    private configService: ConfigService,
    private usersService: UsersService,
    private jwtService: JwtService,
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

  async logout(req: Request) {
    const logoutURL = this.configService.get<string>("logoutURL") || "";
    const expressSessionSecret = this.configService.get<string>(
      "expressSession.secret",
    );

    const logoutResult = await this.additionalLogoutTasks(req, logoutURL);

    if (expressSessionSecret) {
      req.logout(async (err) => {
        if (err) {
          // we should provide a message
          Logger.error("Logout error: ", err);
          //res.status(HttpStatus.BAD_REQUEST);
        }
      });

      return logoutResult;
    } else {
      return logoutResult;
    }
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

        // If there is no LOGOUT_URL set try to get one from the issuer
        const trustIssuer = await Issuer.discover(
          `${oidcConfig?.issuer}/.well-known/openid-configuration`,
        );
        // Flatten the object in case the end_session url is nested.
        const flattenTrustIssuer = flattenObject(trustIssuer);

        // Note search for "end_session" key into the flatten object
        const endSessionEndpointKey = Object.keys(flattenTrustIssuer).find(
          (key) => key.includes("end_session"),
        );

        if (endSessionEndpointKey) {
          // Get the end_session endpoint value
          const endSessionEndpoint = flattenTrustIssuer[endSessionEndpointKey];

          if (endSessionEndpoint) {
            return {
              logout: "successful",
              logoutURL: endSessionEndpoint,
            };
          }
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
