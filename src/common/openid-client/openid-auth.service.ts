import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { FilterQuery } from "mongoose";
import type { IDToken, UserInfoResponse } from "openid-client";
import { Configuration, fetchUserInfo, skipSubjectCheck } from "openid-client";
import { Profile } from "passport";
import { AccessGroupService } from "src/auth/access-group-provider/access-group.service";
import { UserPayload } from "src/auth/interfaces/userPayload.interface";
import { OidcConfig } from "src/config/configuration";
import { CreateUserIdentityDto } from "src/users/dto/create-user-identity.dto";
import { CreateUserDto } from "src/users/dto/create-user.dto";
import { UserProfile } from "src/users/schemas/user-profile.schema";
import { User, UserDocument, UserSchema } from "src/users/schemas/user.schema";
import { UsersService } from "src/users/users.service";
import {
  IOidcUserInfoMapping,
  IOidcUserQueryMapping,
} from "./interfaces/oidc-user.interface";

export type extendedIdTokenClaims = IDToken &
  UserInfoResponse & {
    groups?: string[];
  };
export type OidcProfile = Profile & UserProfile;

@Injectable()
export class OidcAuthService {
  constructor(
    private configService: ConfigService,
    private accessGroupService: AccessGroupService,
    private usersService: UsersService,
  ) {}

  private async fetchUserinfo(
    accessToken: string,
    config?: Configuration,
    expectedSubject?: string,
    logContext = "validate",
  ): Promise<extendedIdTokenClaims | null> {
    if (!config || !accessToken) {
      return null;
    }

    const oidcConfig = this.configService.get<OidcConfig>("oidc");
    if (!oidcConfig?.userinfoEnabled) {
      return null;
    }

    try {
      return (await fetchUserInfo(
        config,
        accessToken,
        expectedSubject ?? skipSubjectCheck,
      )) as extendedIdTokenClaims;
    } catch (error) {
      Logger.warn(
        `Failed to fetch userinfo during ${logContext}: ${(error as Error).message}`,
      );
      return null;
    }
  }

  private async buildProfileWithAccessGroups(
    userinfo: extendedIdTokenClaims,
  ): Promise<{ userProfile: OidcProfile; userPayload: UserPayload }> {
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

    return { userProfile, userPayload };
  }

  async validate(
    tokenset: { id_token?: string; access_token?: string },
    config?: Configuration,
  ): Promise<Omit<User, "password">> {
    const idTokenClaims = tokenset.id_token
      ? (JSON.parse(
          Buffer.from(tokenset.id_token.split(".")[1], "base64url").toString(),
        ) as extendedIdTokenClaims)
      : ({} as extendedIdTokenClaims);

    const userinfoClaims = await this.fetchUserinfo(
      tokenset.access_token ?? "",
      config,
      idTokenClaims.sub,
      "validate",
    );

    const { userProfile } = await this.buildProfileWithAccessGroups(
      userinfoClaims ?? idTokenClaims,
    );

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

  async refreshUserAccessGroups(
    userId: string,
    config: Configuration,
    accessToken: string,
  ): Promise<void> {
    const oidcConfig = this.configService.get<OidcConfig>("oidc");
    if (!oidcConfig?.userinfoEnabled) return;

    let userinfoResponse: extendedIdTokenClaims;
    try {
      userinfoResponse = (await fetchUserInfo(
        config,
        accessToken,
        skipSubjectCheck,
      )) as extendedIdTokenClaims;
    } catch (error) {
      Logger.warn(
        `Failed to fetch userinfo during token refresh: ${(error as Error).message}`,
      );
      return;
    }

    const { userProfile } =
      await this.buildProfileWithAccessGroups(userinfoResponse);

    const existingIdentity =
      await this.usersService.findByIdUserIdentity(userId);
    if (!existingIdentity) return;

    const updatedProfile = {
      ...existingIdentity.profile,
      accessGroups: userProfile.accessGroups,
      email: userProfile.email,
      displayName: userProfile.displayName,
      username: userProfile.username,
    };
    await this.usersService.updateUserIdentity(
      {
        profile: updatedProfile,
        externalId: userProfile.id,
        provider: userProfile.provider || "oidc",
      },
      userId,
    );
    Logger.log(
      `Refreshed access groups for user ${userId}: ${userProfile.accessGroups.join(", ")}`,
    );
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
