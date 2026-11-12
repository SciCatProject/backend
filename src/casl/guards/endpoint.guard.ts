import { CanActivate, ExecutionContext, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { AppAbility } from "../types/casl-subjects";
import { CaslAbilityFactory } from "../casl-ability.factory";
import { ENDPOINT_ACCESS_KEY } from "../decorators/endpoint-access.decorator";
import {
  AccessHandler,
  IAccessCheck,
} from "../interfaces/access-check.interface";

@Injectable()
export class EndpointGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const endpointChecks = this.reflector.get<IAccessCheck[]>(
      ENDPOINT_ACCESS_KEY,
      context.getHandler(),
    );

    if (!endpointChecks) {
      return false;
    }

    const req = context.switchToHttp().getRequest();
    const user = req.user;
    return endpointChecks.every((check) => {
      const ability = this.caslAbilityFactory.collectionAccess(
        check.collection,
        user,
      );
      return this.execHandler(check.handler, ability);
    });
  }

  private execHandler(handler: AccessHandler, ability: AppAbility) {
    if (typeof handler === "function") {
      const res = handler(ability);
      return res;
    }
    return handler.handle(ability);
  }
}
