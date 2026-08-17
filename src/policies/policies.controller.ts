import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { PoliciesService } from "./policies.service";
import { CreatePolicyDto } from "./dto/create-policy.dto";
import { PartialUpdatePolicyDto } from "./dto/update-policy.dto";
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { Policy, PolicyDocument } from "./schemas/policy.schema";
import { FilterQuery } from "mongoose";
import { IPolicyFilter } from "./interfaces/policy-filters.interface";
import { UpdateWherePolicyDto } from "./dto/update-where-policy.dto";
import { IFilters } from "src/common/interfaces/common.interface";
import { JWTUser } from "src/auth/interfaces/jwt-user.interface";
import { FilterPipe } from "src/common/pipes/filter.pipe";
import { CountApiResponse } from "src/common/types";
import { Filter } from "src/datasets/decorators/filter.decorator";

@ApiBearerAuth()
@ApiTags("policies")
@Controller("policies")
export class PoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  updateMergedFiltersForList(
    request: Request,
    mergedFilters: IFilters<PolicyDocument, IPolicyFilter>,
  ): IFilters<PolicyDocument, IPolicyFilter> {
    const user: JWTUser = request.user as JWTUser;

    if (user) {
      const ability = this.caslAbilityFactory.policyAccess(user);
      // these actions are not defined in casl
      const canViewAll = ability.can(Action.ListAll, Policy);
      const canViewTheirOwn = ability.can(Action.ListOwn, Policy);
      if (!canViewAll && canViewTheirOwn) {
        if (!mergedFilters.where) {
          mergedFilters.where = {};
        }
        mergedFilters.where["$or"] = [
          { ownerGroup: { $in: user.currentGroups } },
          { accessGroups: { $in: user.currentGroups } },
          { isPublished: true },
        ];
      }
    }

    return mergedFilters;
  }
  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Create, Policy),
  )
  @Post()
  async create(@Body() createPolicyDto: CreatePolicyDto): Promise<Policy> {
    return this.policiesService.create(createPolicyDto);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Read, Policy),
  )
  @Get()
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieve all policies",
    required: false,
    example: '{"order":"ownerGroup:desc","skip":0,"limit":25}',
  })
  async findAll(
    @Req() request: Request,
    @Filter(new FilterPipe())
    queryFilter: { filter?: IFilters<PolicyDocument, IPolicyFilter> },
  ): Promise<Policy[]> {
    const mergedFilters = this.updateMergedFiltersForList(
      request,
      queryFilter.filter ?? {},
    ) as IFilters<PolicyDocument, IPolicyFilter>;

    return this.policiesService.findAll(mergedFilters);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Read, Policy),
  )
  @Get("/count")
  @ApiQuery({
    name: "where",
    description: "Database filters to apply when retrieving count for polices",
    required: false,
    type: String,
  })
  @ApiResponse({
    status: HttpStatus.OK,
    type: CountApiResponse,
    description:
      "Return the number of datasets in the following format: { count: integer }",
  })
  async count(@Query("where") where?: string) {
    const parsedWhere: FilterQuery<PolicyDocument> = JSON.parse(where ?? "{}");
    return this.policiesService.count(parsedWhere);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Update, Policy),
  )
  @HttpCode(HttpStatus.OK)
  @Post("/updateWhere")
  async updateWhere(@Body() updateWherePolicyDto: UpdateWherePolicyDto) {
    return this.policiesService.updateWhere(
      updateWherePolicyDto.ownerGroupList,
      updateWherePolicyDto.data,
    );
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Read, Policy),
  )
  @Get(":id")
  async findOne(@Param("id") id: string): Promise<Policy | null> {
    return this.policiesService.findOne({ _id: id });
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Update, Policy),
  )
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() updatePolicyDto: PartialUpdatePolicyDto,
  ): Promise<Policy | null> {
    return this.policiesService.update({ _id: id }, updatePolicyDto);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Delete, Policy),
  )
  @Delete(":id")
  async remove(@Param("id") id: string): Promise<unknown> {
    return this.policiesService.remove({ _id: id });
  }
}
