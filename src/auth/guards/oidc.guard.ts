import {
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthGuard } from "@nestjs/passport";
import { Request } from "express";
import type { OidcConfig } from "src/config/configuration";

declare module "express-session" {
  interface SessionData {
    client?: string;
    returnUrl?: string;
    successUrl?: string;
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    expiresIn?: number;
  }
}

@Injectable()
export class OidcAuthGuard extends AuthGuard("oidc") {
  oidcConfig?: OidcConfig;
  constructor(private configService: ConfigService) {
    super();
    this.oidcConfig = this.configService.get<OidcConfig>("oidc");
  }

  getRequest(context: ExecutionContext): Request {
    const request = context.switchToHttp().getRequest<Request>();
    // Check to prevent us from re-creating session info when we're coming back from successful auth.
    // Note that this hard-wired comparison is based on SciCat's API paths, but
    // OIDC_CALLBACK_URL might be configured to end with something other than "/auth/oidc/callback".
    if (request.path.endsWith("/auth/oidc/callback")) {
      return request;
    }

    const client = this.getClient(request);
    const returnUrl = this.getReturnUrl(request, client);
    const successUrl = this.getSuccessUrl(request, client);

    request.session.client = client;
    request.session.returnUrl = returnUrl;
    request.session.successUrl = successUrl;

    return request;
  }

  private getClient(request: Readonly<Request>): string {
    const client = request.query.client;
    if (client && typeof client === "string") {
      if (!this.oidcConfig?.frontendClients.includes(client)) {
        throw new HttpException("Unauthorized client", HttpStatus.UNAUTHORIZED);
      }
      return client;
    }
    return "scicat";
  }

  private getReturnUrl(request: Readonly<Request>, client: string): string {
    const returnUrl = request.query.returnUrl;
    if (returnUrl && typeof returnUrl === "string") {
      return returnUrl;
    } else {
      return this.oidcConfig?.clientConfig[client].returnUrl || "/datasets";
    }
  }

  private getSuccessUrl(request: Readonly<Request>, client: string): string {
    // For MAX IV, recommend deprecating referer and using config-based successUrl only.
    return (
      this.oidcConfig?.clientConfig[client].successUrl ||
      request.headers.referer ||
      ""
    );
  }
}
