import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from "@nestjs/swagger";
import { Request } from "express";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { IFilters } from "src/common/interfaces/common.interface";
import { Filter } from "src/datasets/decorators/filter.decorator";
import { PoliciesService } from "./policies.service";
import { Policy, PolicyDocument } from "./schemas/policy.schema";
import { CreatePolicyV4Dto } from "./dto/create-policy-v4.dto";
import { UpdatePolicyV4Dto } from "./dto/update-policy-v4.dto";
import { IPolicyFilter } from "./interfaces/policy-filters.interface";
import { V4_FILTER_PIPE } from "./pipes/filter.pipe";
import { restrictToOwnPolicies } from "./utils/policy-access-filter.util";

@ApiBearerAuth()
@ApiTags("policies v4")
@Controller({ path: "policies", version: "4" })
export class PoliciesV4Controller {
  constructor(
    private readonly policiesService: PoliciesService,
    private caslAbilityFactory: CaslAbilityFactory,
  ) {}

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Create, Policy),
  )
  @Post()
  async create(@Body() createPolicyDto: CreatePolicyV4Dto): Promise<Policy> {
    return this.policiesService.create(createPolicyDto as Partial<Policy>);
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Read, Policy),
  )
  @Get()
  @ApiQuery({
    name: "filter",
    description: "Database filters to apply when retrieving all policies",
    required: false,
    example: '{"order":"ownerGroup:desc","skip":0,"limit":25}',
  })
  async findAll(
    @Req() request: Request,
    @Filter(...V4_FILTER_PIPE)
    queryFilter: { filter?: IFilters<PolicyDocument, IPolicyFilter> },
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
  @Get(":id")
  @ApiParam({
    name: "id",
    description: "Id of the policy to return",
    type: String,
  })
  async findOne(@Param("id") id: string): Promise<Policy | null> {
    const policy = await this.policiesService.findOne({ _id: id });
    if (!policy) {
      throw new NotFoundException(`Policy not found for id: ${id}`);
    }
    return policy;
  }

  @UseGuards(PoliciesGuard)
  @CheckPolicies("policies", (ability: AppAbility) =>
    ability.can(Action.Update, Policy),
  )
  @Patch(":id")
  @ApiParam({
    name: "id",
    description: "Id of the policy to update",
    type: String,
  })
  async update(
    @Param("id") id: string,
    @Body() updatePolicyDto: UpdatePolicyV4Dto,
  ): Promise<Policy | null> {
    const updated = await this.policiesService.update(
      { _id: id },
      updatePolicyDto as Partial<Policy>,
    );
    if (!updated) {
      throw new NotFoundException(`Policy not found for id: ${id}`);
    }
    return updated;
  }
}
