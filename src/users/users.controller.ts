import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Patch,
  Delete,
  Put,
  Body,
  ForbiddenException,
  HttpCode,
  BadRequestException,
  HttpStatus,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Action } from "src/casl/action.enum";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { UserIdentity } from "./schemas/user-identity.schema";
import { UsersService } from "./users.service";
import { CreateUserJWT } from "./dto/create-user-jwt.dto";
import { AllowAny } from "src/auth/decorators/allow-any.decorator";
import { Request } from "express";
import { JWTUser } from "../auth/interfaces/jwt-user.interface";
import { UserSettings } from "./schemas/user-settings.schema";
import { CreateUserSettingsDto } from "./dto/create-user-settings.dto";
import { PartialUpdateUserSettingsDto } from "./dto/update-user-settings.dto";
import { User } from "./schemas/user.schema";
import { AuthService } from "src/auth/auth.service";
import { CredentialsDto } from "src/auth/dto/credentials.dto";
import { LocalAuthGuard } from "src/auth/guards/local-auth.guard";
import { DatasetClass } from "src/datasets/schemas/dataset.schema";
import { JwtAuthGuard } from "src/auth/guards/jwt-auth.guard";
import { JwtSignOptions } from "@nestjs/jwt";
import { CreateCustomJwt } from "./dto/create-custom-jwt.dto";
import { AuthenticatedPoliciesGuard } from "../casl/guards/auth-check.guard";
import { ReturnedUserDto } from "./dto/returned-user.dto";
import { ReturnedAuthLoginDto } from "src/auth/dto/returnedLogin.dto";
import {
  AdminUpdateUserPasswordDto,
  UpdateUserPasswordDto,
} from "./dto/update-user-password.dto";
import { passwordUpdateResponse } from "src/common/types";

@ApiBearerAuth()
@ApiTags("users")
@Controller("users")
export class UsersController {
  constructor(
    private authService: AuthService,
    private usersService: UsersService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  async checkUserAuthorization(
    request: Request,
    actions: Action[],
    viewedUserId: string,
  ) {
    const authenticatedUser: JWTUser = request.user as JWTUser;
    const viewedUserSchema = new User();
    viewedUserSchema._id = viewedUserId;
    viewedUserSchema.id = viewedUserId;

    const ability =
      this.caslAbilityFactory.userEndpointAccess(authenticatedUser);
    // const authorized = actions.map( action =>
    //   ability.can(action, viewedUserSchema)
    // ) as Array<Boolean>;

    if (!actions.some((action) => ability.can(action, viewedUserSchema))) {
      throw new ForbiddenException("Access Forbidden or Unauthorized");
    }
  }

  @Post("jwt")
  @ApiOperation({
    summary: "It creates a new jwt token.",
    description:
      "It creates a new jwt token. It will be anonymous if no user is logged in.",
  })
  @ApiResponse({
    status: 201,
    type: CreateUserJWT,
    description:
      "Create a new JWT token for anonymous or the user that is currently logged in",
  })
  async getUserJWT(@Req() request: Request): Promise<CreateUserJWT | null> {
    return this.usersService.createUserJWT(request.user as JWTUser);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserListAll, User) ||
      ability.can(Action.UserListOwn, User),
  )
  @Get()
  @ApiOperation({
    summary: "Returns all users.",
    description:
      "Users with admin roles (ADMIN_GROUPS) can retrieve all users. Regular authenticated users can only retrieve their own information.",
  })
  @ApiResponse({
    status: 200,
    type: [ReturnedUserDto],
    description: "List of users.",
  })
  async findAll(@Req() request: Request): Promise<ReturnedUserDto[]> {
    const authenticatedUser = request.user as JWTUser;

    const ability =
      this.caslAbilityFactory.userEndpointAccess(authenticatedUser);

    if (ability.can(Action.UserListAll, User)) {
      // Admin users can see all users
      return this.usersService.findAll();
    }

    // Regular users can only see their own information
    const user = await this.usersService.findById(authenticatedUser._id);
    return user ? [user] : [];
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) =>
    ability.can(Action.UserReadOwn, User),
  )
  @Post("/password")
  @ApiBody({ type: UpdateUserPasswordDto })
  @ApiOperation({
    summary: "It change local user's own password.",
    description:
      "This endpoint change the password of the local user currently logged in",
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    type: passwordUpdateResponse,
    description: "Password changed successfully.",
  })
  async updateOwnPassword(
    @Req() request: Request,
    @Body() updateUserPasswordDto: UpdateUserPasswordDto,
  ): Promise<passwordUpdateResponse | null> {
    const user = request.user as JWTUser;

    await this.checkUserAuthorization(
      request,
      [Action.UserUpdateOwn],
      user._id,
    );

    if (
      updateUserPasswordDto.newPassword !==
      updateUserPasswordDto.confirmPassword
    ) {
      throw new BadRequestException(
        "New password and confirmation password do not match",
      );
    }

    const validUser = await this.authService.validateUser(
      user.username,
      updateUserPasswordDto.currentPassword,
    );

    if (!validUser) {
      throw new BadRequestException("Current password is incorrect");
    }
    if (validUser.authStrategy !== "local") {
      throw new ForbiddenException(
        "Only local users are allowed to change password",
      );
    }
    await this.usersService.updateUserPassword(
      updateUserPasswordDto.newPassword,
      user._id,
    );
    return { message: "Password updated successfully" };
  }

  @ApiBody({ type: CredentialsDto })
  @AllowAny()
  @UseGuards(LocalAuthGuard)
  @Post("login")
  @ApiOperation({
    summary:
      "This endpoint is deprecated and will be removed soon. Use /auth/login instead",
    description:
      "This endpoint is deprecated and will be removed soon. Use /auth/login instead",
  })
  @ApiResponse({
    status: 201,
    type: ReturnedAuthLoginDto,
    description:
      "This endpoint is deprecated and will be removed soon. Use /auth/login instead",
  })
  async login(): Promise<null> {
    return null;
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) =>
    ability.can(Action.UserReadOwn, User),
  )
  @Get("/my/self")
  @ApiOperation({
    summary: "Returns the information of the user currently logged in.",
    description:
      "This allows endpoint allows to retrieve the user record for the user currently logged.",
  })
  @ApiResponse({
    status: 201,
    type: ReturnedUserDto,
    description:
      "Create a new JWT token for anonymous or the user that is currently logged in",
  })
  async getMyUser(@Req() request: Request): Promise<ReturnedUserDto | null> {
    const authenticatedUserId: string = (request.user as JWTUser)._id;
    await this.checkUserAuthorization(
      request,
      [Action.UserReadOwn],
      (request.user as JWTUser)._id,
    );
    return this.usersService.findById(authenticatedUserId);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) =>
    ability.can(Action.UserReadOwn, User),
  )
  @Get("/my/identity")
  async getMyUserIdentity(
    @Req() request: Request,
  ): Promise<UserIdentity | null> {
    const authenticatedUserId: string = (request.user as JWTUser)._id;
    await this.checkUserAuthorization(
      request,
      [Action.UserReadOwn],
      authenticatedUserId,
    );
    return this.usersService.findByIdUserIdentity(authenticatedUserId);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) =>
    ability.can(Action.UserReadOwn, User),
  )
  @Get("/my/settings")
  async getMySettings(@Req() request: Request): Promise<UserSettings | null> {
    const authenticatedUserId: string = (request.user as JWTUser)._id;
    await this.checkUserAuthorization(
      request,
      [Action.UserReadOwn],
      authenticatedUserId,
    );
    return this.usersService.findByIdUserSettings(authenticatedUserId);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserReadOwn, User) ||
      ability.can(Action.UserReadAny, User),
  )
  @Get("/:id")
  async findById(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<ReturnedUserDto | null> {
    await this.checkUserAuthorization(
      request,
      [Action.UserReadAny, Action.UserReadOwn],
      id,
    );
    return this.usersService.findById(id);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) =>
    ability.can(Action.UserUpdateAny, User),
  )
  @Patch("/:id/password")
  @ApiBody({ type: AdminUpdateUserPasswordDto })
  @ApiParam({
    name: "id",
    description: "The ID of the user whose password is to be changed",
    required: true,
    type: String,
    example: "1234567890abcdef12345678",
  })
  @ApiOperation({
    summary: "Change a user’s password (admin only)",
    description:
      "Allows an administrator to update the password of a local user by their user ID.",
  })
  @HttpCode(HttpStatus.OK)
  @ApiResponse({
    status: 200,
    type: passwordUpdateResponse,
    description: "Password changed successfully.",
  })
  async updateUserPassword(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updateUserPasswordDto: AdminUpdateUserPasswordDto,
  ): Promise<passwordUpdateResponse | null> {
    const user = request.user as JWTUser;

    await this.checkUserAuthorization(
      request,
      [Action.UserUpdateAny],
      user._id,
    );
    if (
      updateUserPasswordDto.newPassword !==
      updateUserPasswordDto.confirmPassword
    ) {
      throw new BadRequestException(
        "New password and confirmation password do not match",
      );
    }

    const targetUser = await this.usersService.findById(id).catch((err) => {
      throw new BadRequestException(err.message);
    });

    if (targetUser && targetUser.authStrategy !== "local") {
      throw new ForbiddenException(
        "Only local users passwords can be changed by admin",
      );
    }

    await this.usersService.updateUserPassword(
      updateUserPasswordDto.newPassword,
      id,
    );
    return {
      message: `Password updated successfully for userId: ${id}`,
    };
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserReadOwn, User) ||
      ability.can(Action.UserReadAny, User),
  )
  @Get("/:id/userIdentity")
  async getUserIdentity(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<UserIdentity | null> {
    await this.checkUserAuthorization(
      request,
      [Action.UserReadAny, Action.UserReadOwn],
      id,
    );
    return this.usersService.findByIdUserIdentity(id);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserCreateOwn, User) ||
      ability.can(Action.UserCreateAny, User),
  )
  @Post("/:id/settings")
  async createSettings(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() createUserSettingsDto: CreateUserSettingsDto,
  ): Promise<UserSettings> {
    await this.checkUserAuthorization(
      request,
      [Action.UserCreateAny, Action.UserCreateOwn],
      id,
    );
    return this.usersService.createUserSettings(id, createUserSettingsDto);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserReadOwn, User) ||
      ability.can(Action.UserReadAny, User),
  )
  @Get("/:id/settings")
  async getSettings(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<UserSettings | null> {
    await this.checkUserAuthorization(
      request,
      [Action.UserReadAny, Action.UserReadOwn],
      id,
    );
    return this.usersService.findByIdUserSettings(id);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserUpdateOwn, User) ||
      ability.can(Action.UserUpdateAny, User),
  )
  @Put("/:id/settings")
  async updateSettings(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updateUserSettingsDto: PartialUpdateUserSettingsDto,
  ): Promise<UserSettings | null> {
    await this.checkUserAuthorization(
      request,
      [Action.UserUpdateAny, Action.UserUpdateOwn],
      id,
    );
    return this.usersService.findOneAndUpdateUserSettings(
      id,
      updateUserSettingsDto,
    );
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserUpdateOwn, User) ||
      ability.can(Action.UserUpdateAny, User),
  )
  @Patch("/:id/settings")
  async patchSettings(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updateUserSettingsDto: PartialUpdateUserSettingsDto,
  ): Promise<UserSettings | null> {
    await this.checkUserAuthorization(
      request,
      [Action.UserUpdateAny, Action.UserUpdateOwn],
      id,
    );
    return this.usersService.findOneAndPatchUserSettings(
      id,
      updateUserSettingsDto,
    );
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserUpdateOwn, User) ||
      ability.can(Action.UserUpdateAny, User),
  )
  @ApiParam({ name: "id", type: String, description: "User ID" })
  @ApiBody({
    schema: {
      type: "object",
      additionalProperties: true,
      example: { field: "setting" },
      description:
        "External settings to update. This should be a key-value pair object containing the settings to modify.",
    },
  })
  @Patch("/:id/settings/external")
  async patchExternalSettings(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() externalSettings = {},
  ): Promise<UserSettings | null> {
    await this.checkUserAuthorization(
      request,
      [Action.UserUpdateAny, Action.UserUpdateOwn],
      id,
    );
    return this.usersService.findOneAndPatchUserExternalSettings(
      id,
      externalSettings,
    );
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies(
    "users",
    (ability: AppAbility) =>
      ability.can(Action.UserDeleteOwn, User) ||
      ability.can(Action.UserDeleteAny, User),
  )
  @Delete("/:id/settings")
  async removeSettings(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<unknown> {
    await this.checkUserAuthorization(
      request,
      [Action.UserUpdateAny, Action.UserUpdateOwn],
      id,
    );
    return this.usersService.findOneAndDeleteUserSettings(id);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) => {
    return (
      ability.can(Action.UserReadOwn, User) ||
      ability.can(Action.UserReadAny, User)
    );
  })
  @Get("/:id/authorization/dataset/create")
  async canUserCreateDataset(
    @Req() request: Request,
    @Param("id") id: string,
  ): Promise<unknown> {
    await this.checkUserAuthorization(
      request,
      [Action.UserReadAny, Action.UserReadOwn],
      id,
    );

    const viewedUser = (await this.usersService.findById2JWTUser(
      id,
    )) as JWTUser;
    const ability = this.caslAbilityFactory.datasetAccess(viewedUser);

    const canCreateDataset = ability.can(Action.DatasetCreate, DatasetClass);

    return {
      authorization: canCreateDataset,
    };
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: "It logs the current user out.",
    description: "It logs out the current user.",
  })
  @ApiResponse({
    status: 200,
    description: "User logged out",
  })
  @HttpCode(200)
  @Post("logout")
  async logout(@Req() req: Request) {
    return this.authService.logout(req);
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) =>
    ability.can(Action.UserCreateJwt, User),
  )
  @Post("/:id/jwt")
  @ApiOperation({
    summary: "It creates a new jwt token for the user specified.",
    description:
      "It creates a new jwt token for the user specified. Only users in admin groups can create use this endpoint. Token expiration can be custom. Use 'expiresIn: never' for tokens that have no expiration.",
  })
  @ApiBody({ type: CreateCustomJwt })
  @ApiResponse({
    status: 201,
    type: CreateUserJWT,
    description:
      "Create a new JWT token for specified user with custom properties",
  })
  async createCustomJWT(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() jwtProperties: CreateCustomJwt,
  ): Promise<CreateUserJWT | null> {
    const viewedUser = (await this.usersService.findById(id)) as Omit<
      User,
      "password"
    >;

    if (viewedUser) {
      return this.usersService.createCustomJWT(
        JSON.parse(JSON.stringify(viewedUser)),
        jwtProperties as JwtSignOptions,
      );
    }
    return null;
  }
}
