import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import {
  Client,
  IdTokenClaims,
  Issuer,
  TokenSet,
  UserinfoResponse,
  custom,
} from "openid-client";
import { Profile } from "passport";
import { OidcConfig } from "src/config/configuration";
import { UserProfile } from "src/users/schemas/user-profile.schema";
import { User, UserDocument, UserSchema } from "src/users/schemas/user.schema";
import {
  IOidcUserInfoMapping,
  IOidcUserQueryMapping,
} from "./interfaces/oidc-user.interface";
import { AccessGroupService } from "src/auth/access-group-provider/access-group.service";
import { UsersService } from "src/users/users.service";
import { FilterQuery } from "mongoose";
import { UserPayload } from "src/auth/interfaces/userPayload.interface";
import { CreateUserIdentityDto } from "src/users/dto/create-user-identity.dto";
import { CreateUserDto } from "src/users/dto/create-user.dto";

export type extendedIdTokenClaims = IdTokenClaims &
  UserinfoResponse & {
    groups?: string[];
  };
export type OidcProfile = Profile & UserProfile;

@Injectable()
export class OidcClientService {
  private client: Client | null = null;
  private oidcConfig?: OidcConfig;

  constructor(
    private configService: ConfigService,
    private accessGroupService: AccessGroupService,
    private usersService: UsersService,
  ) {
    this.oidcConfig = this.configService.get<OidcConfig>("oidc");

    // Set a reasonable timeout for HTTP requests made by the openid-client library
    custom.setHttpOptionsDefaults({
      timeout: 7000,
    });
  }

  async getClient(): Promise<Client> {
    if (this.client) return this.client;

    if (!this.oidcConfig?.clientID || !this.oidcConfig?.clientSecret) {
      throw new Error(
        "OIDC clientID or clientSecret is not defined in the configuration.",
      );
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

  async validate(tokenset: TokenSet): Promise<Omit<User, "password">> {
    const userinfo: extendedIdTokenClaims = tokenset.claims();

    const oidcConfig = this.configService.get<OidcConfig>("oidc");

    const userProfile = this.parseUserInfo(userinfo);

    const userPayload: UserPayload = {
      userId: userProfile.id,
      username: userProfile.username,
      email: userProfile.email,
      accessGroupProperty: oidcConfig?.accessGroupProperty,
      payload: userinfo,
    };
    userProfile.accessGroups =
      await this.accessGroupService.getAccessGroups(userPayload);

    const userFilter: FilterQuery<UserDocument> =
      this.parseQueryFilter(userProfile);

    let user = await this.usersService.findOne(userFilter);

    if (!user) {
      const createUser: CreateUserDto = {
        username: userProfile.username,
        email: userProfile.email as string,
        authStrategy: "oidc",
      };

      const newUser = await this.usersService.create(createUser);
      if (!newUser) {
        throw new InternalServerErrorException(
          "Could not create User from OIDC response.",
        );
      }
      Logger.log("Created oidc user ", newUser.username);

      const createUserIdentity: CreateUserIdentityDto = {
        authStrategy: "oidc",
        credentials: {},
        externalId: userProfile.id,
        profile: userProfile,
        provider: userProfile.provider || "oidc",
        userId: newUser._id,
      };

      await this.usersService.createUserIdentity(createUserIdentity);
      Logger.log("Created user identity for oidc user with id ", newUser._id);

      user = newUser;
    } else {
      await this.usersService.updateUser(
        { username: userProfile.username },
        user._id,
      );
      await this.usersService.updateUserIdentity(
        {
          profile: userProfile,
          externalId: userProfile.id,
          provider: userProfile.provider || "oidc",
        },
        user._id,
      );
    }

    const jsonUser = JSON.parse(JSON.stringify(user));
    const { ...returnUser } = jsonUser;
    returnUser.userId = returnUser._id;

    return returnUser;
  }

  getUserPhoto(thumbnailPhoto: string) {
    return thumbnailPhoto
      ? "data:image/jpeg;base64," +
          Buffer.from(thumbnailPhoto, "binary").toString("base64")
      : "no photo";
  }

  parseUserInfo(userinfo: extendedIdTokenClaims) {
    const profile = {} as OidcProfile;

    const customUserInfoFields = this.configService.get<IOidcUserInfoMapping>(
      "oidc.userInfoMapping",
    );

    // To dynamically map user info fields based on environment variables,
    // set mappings like OIDC_USERINFO_MAPPING_FIELD_USERNAME=family_name.
    // This assigns userinfo.family_name to oidcUser.username.

    const oidcUser: IOidcUserInfoMapping = {
      id: userinfo["sub"] ?? (userinfo["user_id"] as string) ?? "",
      username: userinfo["preferred_username"] ?? userinfo["name"] ?? "",
      displayName: userinfo["name"] ?? "",
      familyName: userinfo["family_name"] ?? "",
      email: userinfo["email"] ?? "",
      thumbnailPhoto: (userinfo["thumbnailPhoto"] as string) ?? "",
      provider: userinfo["iss"] ?? "",
      groups: userinfo["groups"] ?? [],
    };

    if (customUserInfoFields) {
      Object.entries(customUserInfoFields).forEach(
        ([sourceField, targetField]) => {
          if (typeof targetField === "string" && targetField in userinfo) {
            oidcUser[sourceField] = userinfo[targetField] as string;
          } else if (Array.isArray(targetField) && targetField.length) {
            const values = targetField
              .filter((field) => field in userinfo)
              .map((field) => userinfo[field] as string);

            if (values.length) {
              oidcUser[sourceField] = values.join("_");
            }
          }
        },
      );
    }

    // Prior to OpenID Connect Basic Client Profile 1.0 - draft 22, the "sub"
    // claim was named "user_id".  Many providers still use the old name, so
    // fallback to that. https://openid.net/specs/openid-connect-core-1_0.html#StandardClaims

    if (!oidcUser.id) {
      throw new Error("Could not find sub or user_id in userinfo response");
    }

    profile.emails = oidcUser.email ? [{ value: oidcUser.email }] : [];
    profile.thumbnailPhoto = this.getUserPhoto(oidcUser.thumbnailPhoto);
    profile.oidcClaims = userinfo;

    const oidcUserProfile = { ...oidcUser, ...profile };

    return oidcUserProfile;
  }

  parseQueryFilter(userProfile: OidcProfile) {
    const userQuery =
      this.configService.get<IOidcUserQueryMapping>("oidc.userQuery");
    const allowedOperators = ["and", "or"];
    const defaultFilter =
      userQuery && allowedOperators.includes(userQuery.operator)
        ? {
            [`$${userQuery.operator}`]: [
              { username: userProfile.username },
              { email: userProfile.email },
            ],
          }
        : {
            $or: [
              { username: userProfile.username },
              { email: userProfile.email },
            ],
          };

    if (!userQuery?.operator || !userQuery.filter.length) {
      return defaultFilter;
    }
    const operator = "$" + userQuery.operator.toLowerCase();
    const filter = userQuery.filter.reduce(
      (acc: Record<string, unknown>[], mapping: string) => {
        const [filterField, userProfileField] = mapping.split(":");
        if (userProfileField in userProfile && UserSchema.path(filterField)) {
          acc.push({
            [filterField]: userProfile[userProfileField as keyof UserProfile],
          });
        }
        return acc;
      },
      [],
    );

    if (filter.length === 0 || !allowedOperators.includes(userQuery.operator)) {
      Logger.log(
        `Executing default userQuery filter: $${JSON.stringify(defaultFilter)}`,
        "OidcStrategy",
      );
      return defaultFilter;
    }

    const customFilter = { [operator]: filter };
    Logger.log(userQuery, "Executing custom userQuery filter", "OidcStrategy");
    return customFilter;
  }
}
