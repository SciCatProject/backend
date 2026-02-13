import { Module } from "@nestjs/common";
import { MongooseModule } from "@nestjs/mongoose";
import { User, UserSchema } from "./schemas/user.schema";
import { UsersService } from "./users.service";
import { UsersController } from "./users.controller";
import {
  UserIdentity,
  UserIdentitySchema,
} from "./schemas/user-identity.schema";
import { RolesService } from "./roles.service";
import { Role, RoleSchema } from "./schemas/role.schema";
import { UserRole, UserRoleSchema } from "./schemas/user-role.schema";
import { ConfigModule } from "@nestjs/config";
import { CaslModule } from "src/casl/casl.module";
import { JwtModule } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import {
  UserSettings,
  UserSettingsSchema,
} from "./schemas/user-settings.schema";
import { UserIdentitiesController } from "./user-identities.controller";
import { UserIdentitiesService } from "./user-identities.service";
import { AuthService } from "src/auth/auth.service";
import { accessGroupServiceFactory } from "src/auth/access-group-provider/access-group-service-factory";

@Module({
  imports: [
    JwtModule.registerAsync({
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>("jwt.secret"),
        signOptions: { expiresIn: configService.get<number>("jwt.expiresIn") },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    CaslModule,
    MongooseModule.forFeature([
      {
        name: UserIdentity.name,
        schema: UserIdentitySchema,
      },
      {
        name: Role.name,
        schema: RoleSchema,
      },
      {
        name: User.name,
        schema: UserSchema,
      },
      {
        name: UserRole.name,
        schema: UserRoleSchema,
      },
      {
        name: UserSettings.name,
        schema: UserSettingsSchema,
      },
    ]),
  ],
  providers: [
    AuthService,
    UsersService,
    UserIdentitiesService,
    RolesService,
    accessGroupServiceFactory,
  ],
  exports: [UsersService, RolesService, UserIdentitiesService],
  controllers: [UsersController, UserIdentitiesController],
})
export class UsersModule {}
