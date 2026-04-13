import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { User } from "src/users/schemas/user.schema";
import { UserPayload } from "../interfaces/userPayload.interface";
import { UsersService } from "src/users/users.service";
import { AccessGroupService } from "../access-group-provider/access-group.service";
import { RolesService } from "src/users/roles.service";
import { Role } from "src/users/schemas/role.schema";
import { UserRole } from "src/users/schemas/user-role.schema";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private rolesService: RolesService,
    //private configService: ConfigService,
    private usersService: UsersService,
    private accessGroupService: AccessGroupService,
  ) {
    super();
  }

  async validate(
    username: string,
    password: string,
  ): Promise<Omit<User, "password">> {
    const user = await this.authService.validateUser(username, password);
    if (!user) {
      throw new UnauthorizedException();
    }

    const userRoles = (await this.rolesService.findAllUserRoles({
      userId: user._id,
    })) as UserRole[];
    const roles: Role[] = (await Promise.all(
      userRoles.map((r) => {
        return this.rolesService.findOne({ _id: r.roleId });
      }),
    )) as Role[];
    const roleGroups: string[] = roles
      .filter((r) => r)
      .map((r) => {
        return r.name as string;
      });

    // updates accessGroups
    const userPayload: UserPayload = {
      userId: user.id as string,
      username: user.username,
      email: user.email,
    };
    const accessGroups =
      await this.accessGroupService.getAccessGroups(userPayload);

    const userIdentity = await this.usersService.findByIdUserIdentity(user._id);
    if (userIdentity === null) {
      throw new Error("User identity does not exists!!!");
    }
    const userProfile = userIdentity.profile;
    userProfile.accessGroups = [...accessGroups, ...roleGroups];

    await this.usersService.updateUserIdentity(
      {
        profile: userProfile,
      },
      user._id,
    );

    return user;
  }
}
