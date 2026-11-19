import {
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from "@nestjs/common";
import { EndpointGuard } from "./endpoint.guard";

export class AuthenticatedEndpointGuard
  extends EndpointGuard
  implements CanActivate
{
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const user = req.user;

    if (!user) {
      throw new UnauthorizedException("Unauthenticated user");
    }

    return super.canActivate(context);
  }
}
