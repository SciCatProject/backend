import { Global, Module } from "@nestjs/common";
import { accessGroupServiceFactory } from "src/auth/access-group-provider/access-group-service-factory";
import { UsersModule } from "src/users/users.module";
import { OidcAuthService } from "./openid-auth.service";
import { OidcClientService } from "./openid-client.service";

@Global()
@Module({
  imports: [UsersModule],
  providers: [OidcClientService, OidcAuthService, accessGroupServiceFactory],
  exports: [OidcClientService, OidcAuthService],
})
export class OidcClientModule {}
