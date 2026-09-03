import {
  BadRequestException,
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from "@nestjs/swagger";
import { Request } from "express";
import { PoliciesGuard } from "src/casl/guards/policies.guard";
import { CheckPolicies } from "src/casl/decorators/check-policies.decorator";
import { AppAbility, CaslAbilityFactory } from "src/casl/casl-ability.factory";
import { Action } from "src/casl/action.enum";
import { parseDate } from "src/common/utils";
import { PoliciesService } from "./policies.service";
import { Policy } from "./schemas/policy.schema";
import { CreatePolicyV4Dto } from "./dto/create-policy-v4.dto";
import { UpdatePolicyV4Dto } from "./dto/update-policy-v4.dto";
import { IPolicyFilterV4 } from "./interfaces/policy-filters.interface";
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
    type: String,
    example:
      '{"where":{"ownerGroup":"group1"},"fields":["ownerGroup","manager"],"limits":{"limit":25,"skip":0,"order":"ownerGroup:desc"}}',
  })
  async findAll(
    @Req() request: Request,
    @Query("filter") queryFilter?: string,
  ): Promise<Policy[]> {
    let parsedFilter: IPolicyFilterV4;
    try {
      parsedFilter = JSON.parse(queryFilter ?? "{}");
    } catch (err) {
      throw new BadRequestException(
        `Invalid JSON in filter: ${(err as Error).message}`,
      );
    }
    const mergedFilters = restrictToOwnPolicies(
      this.caslAbilityFactory,
      request,
      parsedFilter,
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
  @ApiOperation({
    summary: "It partially updates the policy.",
    description: `It updates the policy through the id specified. It updates only the specified fields, merging nested objects (e.g. individual \`jobPolicies\` entries) rather than replacing them wholesale.

- In \`application/json\`, setting a property to \`null\` means "do not change this value."
- In \`application/merge-patch+json\`, setting a property to \`null\` means "reset this value to \`null\`" (or the default value, if one is defined).

**Caution:** updating a specific item in an array is not supported — the result will always replace the entire array.`,
  })
  @ApiParam({
    name: "id",
    description: "Id of the policy to update",
    type: String,
  })
  @ApiConsumes("application/json", "application/merge-patch+json")
  @ApiBody({
    description:
      "Fields that needs to be updated in the policy. Only the fields that needs to be updated have to be passed in.",
    required: true,
    type: UpdatePolicyV4Dto,
  })
  async update(
    @Req() request: Request,
    @Param("id") id: string,
    @Body() updatePolicyDto: UpdatePolicyV4Dto,
  ): Promise<Policy | null> {
    const isMergePatch = !!request.is("application/merge-patch+json");
    const unmodifiedSince = parseDate(request.headers["if-unmodified-since"]);

    const updated = await this.policiesService.update(
      { _id: id },
      updatePolicyDto as Partial<Policy>,
      unmodifiedSince,
      isMergePatch,
    );
    if (!updated) {
      throw new NotFoundException(`Policy not found for id: ${id}`);
    }
    return updated;
  }
}
