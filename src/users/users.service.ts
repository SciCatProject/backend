import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { InjectModel } from "@nestjs/mongoose";
import { genSalt, hash } from "bcrypt";
import { FilterQuery, Model } from "mongoose";
import { CreateUserIdentityDto } from "./dto/create-user-identity.dto";
import { CreateUserDto } from "./dto/create-user.dto";
import { RolesService } from "./roles.service";
import {
  UserIdentity,
  UserIdentityDocument,
} from "./schemas/user-identity.schema";
import { User, UserDocument } from "./schemas/user.schema";
import { CreateRoleDto } from "./dto/create-role.dto";
import { CreateUserRoleDto } from "./dto/create-user-role.dto";
import { CreateUserJWT } from "./dto/create-user-jwt.dto";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { JWTUser } from "../auth/interfaces/jwt-user.interface";
import * as fs from "fs";
import {
  UserSettings,
  UserSettingsDocument,
} from "./schemas/user-settings.schema";
import { CreateUserSettingsDto } from "./dto/create-user-settings.dto";
import {
  PartialUpdateUserSettingsDto,
  UpdateUserSettingsDto,
} from "./dto/update-user-settings.dto";
import { UpdateUserIdentityDto } from "./dto/update-user-identity.dto";
import { UserPayload } from "src/auth/interfaces/userPayload.interface";
import { AccessGroupService } from "src/auth/access-group-provider/access-group.service";
import { ReturnedUserDto } from "./dto/returned-user.dto";
import { UpdateUserDto } from "./dto/update-user.dto";

@Injectable()
export class UsersService implements OnModuleInit {
  constructor(
    private configService: ConfigService,
    private jwtService: JwtService,
    private rolesService: RolesService,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(UserIdentity.name)
    private userIdentityModel: Model<UserIdentityDocument>,
    @InjectModel(UserSettings.name)
    private userSettingsModel: Model<UserSettingsDocument>,
    private accessGroupService: AccessGroupService,
  ) {}

  async onModuleInit() {
    // TODO move this into configuration.ts
    let functionalAccounts = this.configService.get<CreateUserDto[]>(
      "functionalAccounts.accounts",
    );

    const filePath = this.configService.get("functionalAccounts.file");
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, "utf8");
      functionalAccounts = JSON.parse(data);
    }

    if (functionalAccounts && functionalAccounts.length > 0) {
      const accountPromises = functionalAccounts.map(async (account) => {
        const { role, global, ...createAccount } = account;
        createAccount.authStrategy = "local";
        const user = await this.findOrCreate(createAccount);
        const roles: Record<string, Array<string>> = {};
        const rolesList = typeof role === "string" ? [role] : role;

        if (user) {
          const userPayload: UserPayload = {
            userId: user.id as string,
            username: user.username,
            email: user.email,
          };
          const accessGroupsOrig =
            await this.accessGroupService.getAccessGroups(userPayload);
          const accessGroups = [...accessGroupsOrig];

          if (rolesList) {
            rolesList.forEach((r) => {
              // add role as access group
              accessGroups.push(r);
              if (!(r in roles)) {
                roles[r] = [];
              }
              roles[r].push(user._id.toString());
            });
          }
          if (global) {
            accessGroups.push("globalaccess");
            if (!("globalaccess" in roles)) {
              roles["globalaccess"] = [];
            }
            roles["globalaccess"].push(user._id.toString());
          }

          // creates user identity to store access groups
          const createUserIdentity: CreateUserIdentityDto = {
            authStrategy: "local",
            credentials: {},
            externalId: "",
            profile: {
              displayName: account.username as string,
              email: account.email as string,
              username: account.username as string,
              thumbnailPhoto: "error: no photo found",
              emails: [{ value: account.email as string }],
              accessGroups: [
                ...new Set([...(rolesList ?? []), ...accessGroups]),
              ],
              id: user.id as string,
            },
            provider: "local",
            userId: user._id,
          };

          const tempUserIdentity = await this.findByIdUserIdentity(user._id);
          if (tempUserIdentity) {
            await this.updateUserIdentity(createUserIdentity, user._id);
          } else {
            await this.createUserIdentity(createUserIdentity);
          }
        }
        return roles;
      });

      const results = await Promise.all(accountPromises);
      const roles = results.reduce((a, b) => {
        Object.keys(b).forEach((k) => {
          if (k in a) {
            a[k] = a[k].concat(b[k]);
          } else {
            a[k] = b[k];
          }
        });
        return a;
      }, {});
      if (roles) {
        for (const [role, userIds] of Object.entries(roles)) {
          const createRole: CreateRoleDto = {
            name: role,
          };
          const createdRole = await this.rolesService.findOrCreate(createRole);
          if (createdRole && userIds) {
            userIds.forEach(async (userId) => {
              const createUserRole: CreateUserRoleDto = {
                userId: userId,
                roleId: createdRole._id,
              };
              await this.rolesService.findOrCreateUserRole(createUserRole);
            });
          }
        }
      }
    }
  }

  async userExists(filter: FilterQuery<UserDocument>): Promise<boolean> {
    const user = await this.userModel.exists(filter);
    return user ? true : false;
  }

  async create(createUserDto: CreateUserDto): Promise<User | null> {
    Logger.log(
      `Creating user ${createUserDto.username} ( Strategy : ${createUserDto.authStrategy} )`,
      "UsersService",
    );

    if (createUserDto.authStrategy !== "local") {
      const { ...sanitizedCreateUserDto } = createUserDto;
      const createdUser = new this.userModel(sanitizedCreateUserDto);
      return createdUser.save();
    } else if (createUserDto.password) {
      const hashedPassword = await hash(
        createUserDto.password,
        await genSalt(),
      );
      const createUser = { ...createUserDto, password: hashedPassword };
      const createdUser = new this.userModel(createUser);
      return createdUser.save();
    }
    return null;
  }

  async findOrCreate(
    createUserDto: CreateUserDto,
  ): Promise<Omit<User, "password"> | null> {
    const userFilter: FilterQuery<UserDocument> = {
      $or: [
        { username: createUserDto.username },
        { email: createUserDto.email },
      ],
    };
    const userExists = await this.userExists(userFilter);

    if (userExists) {
      return await this.findOne(userFilter);
    }

    return await this.create(createUserDto);
  }

  async findOne(
    filter: FilterQuery<UserDocument>,
    includePassword = false,
  ): Promise<Omit<User, "password"> | null> {
    return includePassword
      ? this.userModel.findOne(filter).select("+password").exec()
      : this.userModel.findOne(filter).exec();
  }

  async findAll(): Promise<ReturnedUserDto[]> {
    const users = await this.userModel.find().exec();
    return users as ReturnedUserDto[];
  }

  async findById(id: string): Promise<ReturnedUserDto | null> {
    const user = await this.userModel.findById(id).exec();
    return user as ReturnedUserDto;
  }

  async findByUsername(username: string): Promise<ReturnedUserDto | null> {
    const user = await this.userModel.findOne({ username: username }).exec();
    return user as ReturnedUserDto;
  }

  async updateUser(
    updateUserDto: UpdateUserDto,
    id: string,
  ): Promise<User | null> {
    return this.userModel.findOneAndUpdate({ _id: id }, updateUserDto).exec();
  }

  async updateUserPassword(
    newPassword: string,
    id: string,
  ): Promise<User | null> {
    const salt = await genSalt();
    const hashedPassword = await hash(newPassword, salt);

    return this.userModel
      .findOneAndUpdate({ _id: id }, { password: hashedPassword })
      .exec();
  }

  async findById2JWTUser(id: string): Promise<JWTUser | null> {
    const userIdentity = await this.userIdentityModel
      .findOne({ userId: id })
      .exec();
    if (userIdentity) {
      const userProfile = userIdentity.profile;
      return {
        _id: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        currentGroups: userProfile.accessGroups,
      } as JWTUser;
    }
    return null;
  }

  async findByUsername2JWTUser(username: string): Promise<JWTUser | null> {
    const userIdentity = await this.userIdentityModel
      .findOne({ "profile.username": username })
      .sort({ created: -1 })
      .exec();
    if (userIdentity) {
      const userProfile = userIdentity.profile;
      return {
        _id: userProfile.id,
        username: userProfile.username,
        email: userProfile.email,
        currentGroups: userProfile.accessGroups,
      } as JWTUser;
    }
    return null;
  }

  async createUserIdentity(
    createUserIdentityDto: CreateUserIdentityDto,
  ): Promise<UserIdentity> {
    const createdUserIdentity = new this.userIdentityModel(
      createUserIdentityDto,
    );
    return createdUserIdentity.save();
  }

  async updateUserIdentity(
    updateUserIdentityDto: UpdateUserIdentityDto,
    userId: string,
  ): Promise<UserIdentity | null> {
    return this.userIdentityModel
      .findOneAndUpdate({ userId }, updateUserIdentityDto, { new: true })
      .exec();
  }

  // NOTE: This is just for testing purposes inside accessGroups.e2e-spec.ts
  async removeUserIdentity(userId: string): Promise<UserIdentity | null> {
    const removedUserIdentity = await this.userIdentityModel
      .findOneAndDelete({ userId })
      .exec();

    return removedUserIdentity;
  }

  async findByIdUserIdentity(userId: string): Promise<UserIdentity | null> {
    return this.userIdentityModel.findOne({ userId }).exec();
  }

  async createUserSettings(
    userId: string,
    createUserSettingsDto: CreateUserSettingsDto,
  ): Promise<UserSettings> {
    const createdUserSettings = new this.userSettingsModel({
      ...createUserSettingsDto,
      userId,
    });
    return createdUserSettings.save();
  }

  async findByIdUserSettings(userId: string): Promise<UserSettings | null> {
    const result = await this.userSettingsModel
      .findOne({ userId })
      .lean()
      .exec();

    return result;
  }

  async findOneAndUpdateUserSettings(
    userId: string,
    updateUserSettingsDto: UpdateUserSettingsDto | PartialUpdateUserSettingsDto,
  ): Promise<UserSettings | null> {
    const result = await this.userSettingsModel
      .findOneAndUpdate({ userId }, updateUserSettingsDto, {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      })
      .exec();

    return result;
  }

  async findOneAndPatchUserSettings(
    userId: string,
    updateUserSettingsDto: UpdateUserSettingsDto | PartialUpdateUserSettingsDto,
  ): Promise<UserSettings | null> {
    const result = await this.userSettingsModel
      .findOneAndUpdate(
        { userId },
        { $set: updateUserSettingsDto },
        { new: true },
      )
      .exec();
    return result;
  }

  async findOneAndPatchUserExternalSettings(
    userId: string,
    externalSettings: Record<string, unknown>,
  ): Promise<UserSettings | null> {
    const updateQuery: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(externalSettings)) {
      updateQuery[`externalSettings.${key}`] = value;
    }
    const result = await this.userSettingsModel
      .findOneAndUpdate({ userId }, { $set: updateQuery }, { new: true })
      .exec();
    return result;
  }
  async findOneAndDeleteUserSettings(userId: string): Promise<unknown> {
    return this.userSettingsModel.findOneAndDelete({ userId }).exec();
  }

  async createUserJWT(
    accessToken: JWTUser | undefined,
  ): Promise<CreateUserJWT | null> {
    const expiresInOption =
      this.configService.get<string>("jwt.expiresIn") || "1h";

    if (!accessToken) {
      const groups = ["public"];
      const payload = {
        username: "anonymous",
        groups,
      };
      const jwtString = this.jwtService.sign(payload, {
        expiresIn: expiresInOption,
      } as JwtSignOptions);
      return { jwt: jwtString };
    }

    const payload = {
      username: accessToken._id,
      groups: accessToken.currentGroups,
    };
    const jwtString = this.jwtService.sign(payload, {
      expiresIn: expiresInOption,
    } as JwtSignOptions);
    return { jwt: jwtString };
  }

  async createCustomJWT(
    user: Omit<User, "password">,
    jwtProperties: JwtSignOptions,
  ): Promise<CreateUserJWT | null> {
    const signAndVerifyOptions: JwtSignOptions = {
      ...jwtProperties,
    };
    const expiresInValue = signAndVerifyOptions.expiresIn as
      | string
      | number
      | undefined;
    if (expiresInValue === "never") {
      signAndVerifyOptions.expiresIn = (this.configService.get<string>(
        "jwt.neverExpires",
      ) || "100y") as JwtSignOptions["expiresIn"];
    } else if (
      typeof expiresInValue === "string" &&
      expiresInValue &&
      !isNaN(+expiresInValue)
    ) {
      signAndVerifyOptions.expiresIn = parseInt(expiresInValue);
    } else if (!expiresInValue) {
      signAndVerifyOptions.expiresIn = (this.configService.get<string>(
        "jwt.expiresIn",
      ) || "1h") as JwtSignOptions["expiresIn"];
    }
    signAndVerifyOptions.secret = this.configService.get<string>("jwt.secret");
    const jwtString = this.jwtService.sign(user, signAndVerifyOptions);
    return { jwt: jwtString };
  }
}
