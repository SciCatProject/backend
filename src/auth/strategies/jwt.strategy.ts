import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { Request } from "express";
import { RolesService } from "src/users/roles.service";
import { UsersService } from "src/users/users.service";
import { JWTUser } from "../interfaces/jwt-user.interface";
import { User } from "src/users/schemas/user.schema";
import { ConfigService } from "@nestjs/config";
import {
  SSE_STREAM_PATH,
  fromSseTicket,
  requireJwtSecret,
} from "src/auth/utils/jwt.util";

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private rolesService: RolesService,
    private usersService: UsersService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        fromSseTicket,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: requireJwtSecret(configService),
      passReqToCallback: true,
    });
  }

  async validate(
    request: Request,
    payload: Omit<User, "password"> & { purpose?: string },
  ) {
    const isSsePath = request.path === SSE_STREAM_PATH;
    const isSseTicket = payload.purpose === "sse";
    if (isSsePath !== isSseTicket) {
      throw new UnauthorizedException();
    }

    const roles = await this.rolesService.find({ userId: payload._id });

    const userIdentity = await this.usersService.findByIdUserIdentity(
      payload._id,
    );

    let currentGroups: string[] = [];

    if (roles) {
      const roleNames = roles
        .map((role) => (role ? role.name : ""))
        .filter((name) => name.length > 0);
      currentGroups = currentGroups.concat(roleNames);
    }

    if (userIdentity) {
      currentGroups = currentGroups.concat(userIdentity.profile.accessGroups);
    }

    currentGroups = [...new Set([...currentGroups])];

    return {
      _id: payload._id,
      username: payload.username,
      email: payload.email,
      currentGroups: currentGroups,
      authStrategy: payload.authStrategy,
    } as JWTUser;
  }
}
