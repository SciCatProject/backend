import {
  Controller,
  ForbiddenException,
  Get,
  Headers,
  HttpStatus,
  NotFoundException,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { Action } from "src/casl/action.enum";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { UserIdentity } from "./schemas/user-identity.schema";
import { UserIdentitiesService } from "./user-identities.service";
import { Request } from "express";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { User } from "./schemas/user.schema";
import { AuthenticatedPoliciesGuard } from "../casl/guards/auth-check.guard";
import {
  filterUserIdentityDescription,
  filterUserIdentityExample,
} from "src/common/utils";

@ApiBearerAuth()
@ApiTags("user identities")
@Controller("useridentities")
export class UserIdentitiesController {
  constructor(
    private userIdentitiesService: UserIdentitiesService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) =>
    ability.can(Action.UserRead, User),
  )
  @Get("/findOne")
  @ApiQuery({
    name: "filter",
    description:
      "Full database filters to apply when checking for the email. The filter can be just the where clause or the full filter syntax\n" +
      filterUserIdentityDescription,
    required: false,
    type: String,
    example: filterUserIdentityExample,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: UserIdentity,
    isArray: false,
    description:
      "Results with UserIdentity object if a registered user exists that have the email provided listed as main email",
  })
  async findOne(
    // NOTE: This now supports both headers filter and query filter.
    // There is a loopback config file where we have this as a setting on the frontend.
    // In the future if we fully migrate to the new backend we can only support query filters.
    @Headers() headers: Record<string, string>,
    @Req() request: Request,
    @Query("filter") queryFilters?: string,
  ) {
    const parsedQueryFilters = JSON.parse(queryFilters ?? "{}");
    let filter = {};
    if (headers.filter) {
      const parsedFilter = JSON.parse(headers.filter);
      if (parsedFilter.where) {
        filter = parsedFilter.where;
      }
    } else if (parsedQueryFilters.where) {
      filter = parsedQueryFilters.where;
    }

    const authenticatedUser: JWTUser = request.user as JWTUser;
    const ability = this.caslAbilityFactory.userAccess(authenticatedUser);

    if (
      !ability.can(Action.AccessAny, User) &&
      ability.can(Action.UserRead, User)
    ) {
      // this user can only see his/her user identity
      filter = { userId: authenticatedUser._id, ...filter };
    }

    const identity = (await this.userIdentitiesService.findOne(
      filter,
    )) as UserIdentity;

    if (!identity) {
      throw new NotFoundException();
    }

    const user = new User();
    user._id = identity.userId;
    user.id = identity.userId;
    if (
      !ability.can(Action.UserRead, user) &&
      !ability.can(Action.AccessAny, User)
    ) {
      throw new ForbiddenException("Access Forbidden or Unauthorized");
    }

    return identity;
  }

  @UseGuards(AuthenticatedPoliciesGuard)
  @CheckPolicies("users", (ability: AppAbility) =>
    ability.can(Action.AccessAny, User),
  )
  @Get("/isValidEmail")
  @ApiOperation({
    summary:
      "It returns true if the emailed passed in is linked to any registered users",
    description:
      "This endpoint check if the email passed in as parameter is a valid email connected to a known user that has a record in this instance of SciCat",
  })
  @ApiQuery({
    name: "filter",
    description:
      "Email to be checked or full filter format query to apply when checking for the email\n" +
      filterUserIdentityDescription,
    required: false,
    type: String,
    example: filterUserIdentityExample,
  })
  @ApiResponse({
    status: 201,
    type: Boolean,
    description:
      "Results is true if a registered user exists that have the emailed provided listed as main email",
  })
  async isValidEmail(
    // NOTE: This now supports both headers filter and query filter.
    // There is a loopback config file where we have this as a setting on the frontend.
    // In the future if we fully migrate to the new backend we can only support query filters.
    @Headers() headers: Record<string, string>,
    @Query("filter") queryFilters?: string,
  ): Promise<boolean | null> {
    let parsedQueryFilters;
    try {
      parsedQueryFilters = JSON.parse(queryFilters ?? "{}");
    } catch {
      parsedQueryFilters = {
        where: {
          "profile.email": queryFilters,
        },
      };
    }

    let filter = {};
    if (headers.filter) {
      const parsedFilter = JSON.parse(headers.filter);
      if (parsedFilter.where) {
        filter = parsedFilter.where;
      }
    } else if (parsedQueryFilters.where) {
      filter = parsedQueryFilters.where;
    }

    const identity = (await this.userIdentitiesService.findOne(
      filter,
    )) as UserIdentity;

    return identity ? true : false;
  }
}
