import {
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AuthGuard } from "@nestjs/passport";

@Injectable()
export class JwtAuthGuard extends AuthGuard("jwt") {
  constructor(private readonly reflector: Reflector) {
    super();
  }

  getRequest(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const token = request.query.access_token;
    if (!request.headers.authorization && token) {
      request.headers.authorization = token;
    }

    return request;
  }

  handleRequest(
    err: unknown,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    user: any,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any,
    info: any,
  ) {
    // const allowAny = this.reflector.get<string[]>(
    //   "allow-any",
    //   context.getHandler(),
    // );

    if (user) {
      return user;
    }

    if (!err && info?.name === "TokenExpiredError") {
      throw new UnauthorizedException("SESSION_EXPIRED");
    }
    // if (allowAny) {
    //   return null;
    // }
    // throw new UnauthorizedException();
    return null;
  }
}
