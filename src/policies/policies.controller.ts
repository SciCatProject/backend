import {
  ClassSerializerInterceptor,
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  UseInterceptors,
  Query,
  HttpCode,
  HttpStatus,
  Req,
} from "@nestjs/common";
import { Request } from "express";
import { PoliciesService } from "./policies.service";
import { CreatePolicyDto } from "./dto/create-policy.dto";
import { PartialUpdatePolicyDto } from "./dto/update-policy.dto";
import { PolicyObsoleteDto } from "./dto/policy.obsolete.dto";
import { SerializeAsV3 } from "src/common/decorators/serialize-as-v3.decorator";
import { LEGACY_NOTIFICATION_PIPE } from "./pipes/legacy-notification.pipe";
import { V3_FILTER_PIPE, V3_WHERE_PIPE } from "./pipes/filter.pipe";
import { ApiBearerAuth, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { Policy, PolicyDocument } from "./schemas/policy.schema";
import { FilterQuery } from "mongoose";
import { IPolicyFilterV4 } from "./interfaces/policy-filters.interface";
import { UpdateWherePolicyDto } from "./dto/update-where-policy.dto";
import { CountApiResponse } from "src/common/types";
import { Filter } from "src/datasets/decorators/filter.decorator";
import { restrictToOwnPolicies } from "./utils/policy-access-filter.util";

@ApiBearerAuth()
@ApiTags("policies")
@Controller("policies")
@UseInterceptors(ClassSerializerInterceptor)
export class PoliciesController {
  constructor(
    private readonly policiesService: PoliciesService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Create, Policy),
  )
  @SerializeAsV3(PolicyObsoleteDto)
  @Post()
  async create(
    @Body(LEGACY_NOTIFICATION_PIPE)
    createPolicyDto: CreatePolicyDto,
  ): Promise<Policy> {
    return this.policiesService.create(
      createPolicyDto as unknown as Partial<Policy>,
    );
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
  @SerializeAsV3(PolicyObsoleteDto)
  async findAll(
    @Req() request: Request,
    @Filter(...V3_FILTER_PIPE)
    queryFilter: { filter?: IPolicyFilterV4 },
  ): Promise<Policy[]> {
    const mergedFilters = restrictToOwnPolicies(
      this.caslAbilityFactory,
      request,
      queryFilter.filter ?? {},
    );

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
  async count(
    @Query("where", V3_WHERE_PIPE) where?: FilterQuery<PolicyDocument>,
  ) {
    return this.policiesService.count(where ?? {});
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
      LEGACY_NOTIFICATION_PIPE.transform(updateWherePolicyDto.data),
    );
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Read, Policy),
  )
  @Get(":id")
  @SerializeAsV3(PolicyObsoleteDto)
  async findOne(@Param("id") id: string): Promise<Policy | null> {
    return this.policiesService.findOne({ _id: id });
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Update, Policy),
  )
  @SerializeAsV3(PolicyObsoleteDto)
  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body(LEGACY_NOTIFICATION_PIPE)
    updatePolicyDto: PartialUpdatePolicyDto,
  ): Promise<Policy | null> {
    return this.policiesService.update(
      { _id: id },
      updatePolicyDto as unknown as Partial<Policy>,
    );
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Delete, Policy),
  )
  @SerializeAsV3(PolicyObsoleteDto)
  @Delete(":id")
  async remove(@Param("id") id: string): Promise<unknown> {
    return this.policiesService.remove({ _id: id });
  }
}
