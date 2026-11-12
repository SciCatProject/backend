import { Strategy } from "passport-local";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { AuthService } from "../auth.service";
import { User } from "src/users/schemas/user.schema";
import { UserPayload } from "../interfaces/userPayload.interface";
import { UsersService } from "src/users/users.service";
import { AccessGroupService } from "../access-group-provider/access-group.service";
import { UserRolesService } from "src/users/user-roles.service";

@Injectable()
export class LocalStrategy extends PassportStrategy(Strategy) {
  constructor(
    private authService: AuthService,
    private userRolesService: UserRolesService,
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

    const userRoles = await this.userRolesService.findAll({
      userId: user._id,
    });
    const roleGroups: string[] = (userRoles ?? [])
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
